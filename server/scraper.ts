import * as cheerio from "cheerio";

const PORTAL_BASE = "https://www.marchespublics.gov.ma";
const SEARCH_URL = `${PORTAL_BASE}/index.php?page=entreprise.EntrepriseAdvancedSearch&AllCons&searchAnnCons`;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
};

export interface ScrapedTender {
  refConsultation: string;
  orgAcronyme: string;
  reference: string;
  title: string;
  procedureType: string;
  category: string;
  publicationDate: string | null;
  submissionDeadline: string | null;
  buyer: string;
  executionLocation: string | null;
  portalUrl: string;
  estimatedBudget: string | null;
  provisionalGuaranteeAmount: string | null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function mapProcedureType(raw: string): string {
  const r = raw.toLowerCase().trim();
  if (r.includes("restreint")) return "AO restreint";
  if (r.includes("ouvert")) return "AO ouvert";
  if (r.includes("concours")) return "concours";
  if (r.includes("consultation")) return "consultation";
  if (r.includes("gré à gré")) return "gré à gré";
  return raw.trim() || "AO ouvert";
}

function mapCategory(raw: string): string {
  const r = raw.toLowerCase().trim();
  if (r.includes("travaux")) return "travaux";
  if (r.includes("fournitures") || r.includes("fourniture")) return "fournitures";
  if (r.includes("services") || r.includes("service")) return "services";
  return raw.trim() || "services";
}

/** Parse a MAD amount string like "379 104,00" or "7 000,00 MAD" to decimal string */
function parseMADAmount(text: string): string | null {
  const cleaned = text
    .replace(/\s/g, "")
    .replace(/MAD.*$/i, "")
    .replace(",", ".")
    .trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num === 0) return null;
  return num.toFixed(2);
}

async function fetchPageHtml(cookies: string, pradoState: string, pageSize: number): Promise<string> {
  const params = new URLSearchParams();
  params.set("main_form", "");
  params.set("PRADO_PAGESTATE", pradoState);
  params.set("PRADO_POSTBACK_TARGET", "ctl0$CONTENU_PAGE$resultSearch$listePageSizeTop");
  params.set("ctl0$CONTENU_PAGE$resultSearch$listePageSizeTop", String(pageSize));
  params.set("ctl0$CONTENU_PAGE$resultSearch$listePageSizeBottom", String(pageSize));

  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      "Referer": SEARCH_URL,
      "Cookie": cookies,
    },
    body: params.toString(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Portal returned ${response.status}`);
  return response.text();
}

async function getInitialPage(): Promise<{ html: string; cookies: string; pradoState: string }> {
  const response = await fetch(SEARCH_URL, {
    headers: HEADERS,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Portal returned ${response.status}`);

  const rawCookies = response.headers.getSetCookie?.() ?? [];
  const cookies = rawCookies
    .map((c: string) => c.split(";")[0])
    .join("; ");

  const html = await response.text();

  const $ = cheerio.load(html);
  const pradoState = $("#PRADO_PAGESTATE").val() as string;

  if (!pradoState) throw new Error("Impossible de récupérer l'état PRADO du portail");

  return { html, cookies, pradoState };
}

/** Fetch the detail page for a consultation and extract financial fields */
async function fetchTenderDetail(
  refConsultation: string,
  orgAcronyme: string
): Promise<{ estimatedBudget: string | null; provisionalGuaranteeAmount: string | null }> {
  const url = `${PORTAL_BASE}/index.php?page=entreprise.EntrepriseDetailsConsultation&refConsultation=${refConsultation}&orgAcronyme=${orgAcronyme}`;

  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return { estimatedBudget: null, provisionalGuaranteeAmount: null };

    const html = await response.text();
    const $ = cheerio.load(html);

    // Estimation (en Dhs TTC) — span with class content-bloc near labelReferentielZoneText
    const estSpan = $("span[id*='labelReferentielZoneText'].content-bloc").first();
    const estimatedBudget = estSpan.length
      ? parseMADAmount(estSpan.text())
      : null;

    // Montant caution provisoire — span with id cautionProvisoire
    const cautionSpan = $("span[id*='cautionProvisoire']").first();
    const provisionalGuaranteeAmount = cautionSpan.length
      ? parseMADAmount(cautionSpan.text())
      : null;

    return { estimatedBudget, provisionalGuaranteeAmount };
  } catch {
    return { estimatedBudget: null, provisionalGuaranteeAmount: null };
  }
}

export function parseTenders(html: string): ScrapedTender[] {
  const $ = cheerio.load(html);
  const tenders: ScrapedTender[] = [];

  $("input[id*='_refCons']").each((_i, el) => {
    const refCons = $(el).val() as string;
    if (!refCons) return;

    const td = $(el).closest("td");
    const orgCons = td.find("input[id*='_orgCons']").val() as string || "";
    const row = $(el).closest("tr");

    // Procedure type
    const procDiv = row.find("[id*='panelBlocTypesProc'] div[id*='type_procedure']");
    const procedureRaw = procDiv.text().trim();

    // Category
    const catDiv = row.find("[id*='panelBlocCategorie']");
    const categoryRaw = catDiv.first().text().trim();

    // Publication date
    const col90 = row.find("td[headers='cons_ref']");
    const allDivTexts = col90.find("> div").map((_j, d) => $(d).text().trim()).get();
    const pubDateRaw = allDivTexts.find(t => /^\d{2}\/\d{2}\/\d{4}$/.test(t.trim())) || null;

    // Reference
    const referenceEl = row.find("span.ref");
    const reference = referenceEl.first().text().trim();

    // Title/Object — strip hidden tooltip divs
    const objDiv = row.find("[id*='panelBlocObjet']").first();
    const objClone = objDiv.clone();
    objClone.find(".info-bulle, .info-suite, [class*='info-bulle']").remove();
    let title = objClone.text().replace(/\s+/g, " ").trim();
    title = title.replace(/^Objet\s*:\s*/i, "").replace(/\.{2,}$/g, "").trim();

    // Buyer — strip tooltips
    const buyerDiv = row.find("[id*='panelBlocDenomination']").first();
    const buyerClone = buyerDiv.clone();
    buyerClone.find(".info-bulle, .info-suite, [class*='info-bulle']").remove();
    let buyer = buyerClone.text().replace(/\s+/g, " ").trim();
    buyer = buyer.replace(/^Acheteur public\s*:\s*/i, "").trim();

    // Deadline
    const deadlineTd = row.find("td[headers='cons_dateEnd']");
    const deadlineText = deadlineTd.find(".cloture-line").first().text().replace(/\s+/g, " ").trim();
    const deadlineDateMatch = deadlineText.match(/\d{2}\/\d{2}\/\d{4}/);

    // Execution location
    const locTd = row.find("td[headers='cons_lieuExe']");
    const location = locTd.text().replace(/\s+/g, " ").trim() || null;

    const portalUrl = `${PORTAL_BASE}/?page=entreprise.EntrepriseDetailsConsultation&refConsultation=${refCons}&orgAcronyme=${orgCons}&code=&retraits`;

    tenders.push({
      refConsultation: refCons,
      orgAcronyme: orgCons,
      reference: reference || `MP-${refCons}`,
      title: title || `Consultation ${refCons}`,
      procedureType: mapProcedureType(procedureRaw),
      category: mapCategory(categoryRaw),
      publicationDate: pubDateRaw ? parseDate(pubDateRaw) : null,
      submissionDeadline: deadlineDateMatch ? parseDate(deadlineDateMatch[0]) : null,
      buyer,
      executionLocation: location || null,
      portalUrl,
      estimatedBudget: null,
      provisionalGuaranteeAmount: null,
    });
  });

  return tenders;
}

export async function scrapePortalTenders(buyerFilter: string): Promise<{
  tenders: ScrapedTender[];
  totalFound: number;
  filtered: number;
}> {
  // Step 1: Get initial page with PRADO state + cookies
  const { cookies, pradoState } = await getInitialPage();

  // Step 2: POST to get 500 results per page
  const bigPageHtml = await fetchPageHtml(cookies, pradoState, 500);

  // Step 3: Parse all tenders
  const allTenders = parseTenders(bigPageHtml);

  // Step 4: Filter by buyer name (exact match, case-insensitive)
  const filterUpper = buyerFilter.toUpperCase().trim();
  const filtered = allTenders.filter(t =>
    t.buyer.toUpperCase().trim() === filterUpper
  );

  // Step 5: Enrich each filtered tender with financial data from its detail page
  await Promise.all(
    filtered.map(async (tender) => {
      const detail = await fetchTenderDetail(tender.refConsultation, tender.orgAcronyme);
      tender.estimatedBudget = detail.estimatedBudget;
      tender.provisionalGuaranteeAmount = detail.provisionalGuaranteeAmount;
    })
  );

  return {
    tenders: filtered,
    totalFound: allTenders.length,
    filtered: filtered.length,
  };
}
