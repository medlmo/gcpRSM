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
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // Format: DD/MM/YYYY
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

export function parseTenders(html: string): ScrapedTender[] {
  const $ = cheerio.load(html);
  const tenders: ScrapedTender[] = [];

  // Each data row has hidden inputs for refCons and orgCons
  $("input[id*='_refCons']").each((_i, el) => {
    const refCons = $(el).val() as string;
    if (!refCons) return;

    // Find the sibling orgCons input in the same td
    const td = $(el).closest("td");
    const orgCons = td.find("input[id*='_orgCons']").val() as string || "";

    // The row context - go up to tr
    const row = $(el).closest("tr");

    // Procedure type (full name from tooltip div)
    const procDiv = row.find("[id*='panelBlocTypesProc'] div[id*='type_procedure']");
    const procedureRaw = procDiv.text().trim();

    // Category
    const catDiv = row.find("[id*='panelBlocCategorie']");
    const categoryRaw = catDiv.first().text().trim();

    // Publication date (first plain div after category in col-90)
    const col90 = row.find("td[headers='cons_ref']");
    const allDivTexts = col90.find("> div").map((_j, d) => $(d).text().trim()).get();
    const pubDateRaw = allDivTexts.find(t => /^\d{2}\/\d{2}\/\d{4}$/.test(t.trim())) || null;

    // Reference
    const referenceEl = row.find("span.ref");
    const reference = referenceEl.first().text().trim();

    // Title/Object — clone and strip hidden tooltip divs before extracting text
    const objDiv = row.find("[id*='panelBlocObjet']").first();
    const objClone = objDiv.clone();
    objClone.find(".info-bulle, .info-suite, [class*='info-bulle']").remove();
    let title = objClone.text().replace(/\s+/g, " ").trim();
    // Remove "Objet :" prefix and trailing ellipsis
    title = title.replace(/^Objet\s*:\s*/i, "").replace(/\.{2,}$/g, "").trim();

    // Buyer — strip tooltips before extracting text
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
    });
  });

  return tenders;
}

export async function scrapePortalTenders(buyerFilter: string): Promise<{
  tenders: ScrapedTender[];
  totalFound: number;
  filtered: number;
}> {
  // Step 1: Get initial page with PRADO state
  const { cookies, pradoState } = await getInitialPage();

  // Step 2: POST to get 500 results per page
  const bigPageHtml = await fetchPageHtml(cookies, pradoState, 500);

  // Step 3: Parse all tenders
  const allTenders = parseTenders(bigPageHtml);

  // Step 4: Filter by buyer name (exact match)
  const filterUpper = buyerFilter.toUpperCase().trim();
  const filtered = allTenders.filter(t =>
    t.buyer.toUpperCase().trim() === filterUpper
  );

  return {
    tenders: filtered,
    totalFound: allTenders.length,
    filtered: filtered.length,
  };
}
