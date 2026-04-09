import * as cheerio from "cheerio";

const PORTAL_BASE = "https://www.marchespublics.gov.ma";
const SEARCH_FORM_URL = `${PORTAL_BASE}/index.php?page=entreprise.EntrepriseAdvancedSearch&searchAnnCons`;

// ── Identifiants pour REGION DE SOUS-MASSA (configurable via .env) ─────────
// Discovered via portal cascade, mais surchargés par les variables d'environnement
// pour éviter de recompiler en cas de changement.
const BUYER_CLASSIFICATION = process.env.PORTAL_BUYER_CLASSIFICATION || "2";
const BUYER_ORG_ACRONYME = process.env.PORTAL_BUYER_ORG_ACRONYME || "f9f";
const BUYER_ENTITY_ID = process.env.PORTAL_BUYER_ENTITY_ID || "246";
const EXPECTED_BUYER_NAME = (process.env.PORTAL_BUYER_NAME || "REGION DE SOUS-MASSA")
  .toUpperCase()
  .trim()
  .replace(/\s+/g, " ");

// In practice, the filtered result set is usually <= 30 AOs.
// Keep this small to reduce payload size and avoid portal timeouts.
const PAGE_SIZE = 100;

const DETAIL_DELAY_MS = 500;  // gap between consecutive detail-page fetches
const MAX_RETRIES = 3;        // retry attempts for transient failures
const REQUEST_TIMEOUT_MS = 25000; // default fallback

// Different endpoints have very different latency characteristics.
const TIMEOUT_FORM_MS = 45000;
const TIMEOUT_CALLBACK_MS = 45000;
const TIMEOUT_SEARCH_MS = 60000;
const TIMEOUT_PAGE_SIZE_MS = 60000;
const TIMEOUT_DETAIL_MS = 30000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
  "Connection": "keep-alive",
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
  openingDate: string | null;
  buyer: string;
  executionLocation: string | null;
  portalUrl: string;
  estimatedBudget: string | null;
  provisionalGuaranteeAmount: string | null;
  lotsNumber: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch with automatic retry and exponential back-off (handles 500/503) */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: {
    retries?: number;
    timeoutMs?: number;
    retryOnStatuses?: number[];
  } = {}
): Promise<Response> {
  const retries = opts.retries ?? MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const retryOnStatuses = opts.retryOnStatuses ?? [500, 503, 429];
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await sleep(300 * Math.pow(2, attempt - 1));
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

      // Some statuses should not be retried (e.g. 403 means blocked)
      if (res.status === 403) return res;

      if (retryOnStatuses.includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        // Back off a bit more aggressively for rate limiting.
        await sleep((res.status === 429 ? 2000 : 800) * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function parsePradoState(html: string): string {
  const m = html.match(/name=["']PRADO_PAGESTATE["'][^>]*value=["']([^"']+)["']/)
    ?? html.match(/<!--X-PRADO-PAGESTATE-->([\s\S]*?)<!--\/X-PRADO-PAGESTATE-->/);
  return m ? m[1] : "";
}

function extractTotalFound(html: string): number | null {
  const m = html.match(/nombreElement["']>(\d+)<\/span>/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseDateTimeToLocalIso(text: string): string | null {
  if (!text) return null;
  // Supports both "10:00" and "10H00" / "10h00" (French portal notation)
  // and optional "à" prefix before the time: "02/04/2026 à 10H00"
  const m = text
    .trim()
    .match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(?:à\s*)?(\d{1,2})\s*[:Hh]\s*(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hhRaw, minRaw] = m;
  const hh = hhRaw ? String(hhRaw).padStart(2, "0") : "00";
  const min = minRaw ?? "00";
  // Morocco is UTC+1 year-round (no DST since 2018). Append the explicit offset
  // so Node.js does not interpret the value as UTC and shift the time by 1 hour.
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00+01:00`;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractDateTimeNearKeyword(text: string, keywordRegex: RegExp): string | null {
  const normalized = normalizeSpaces(text);
  const dateTimePattern = /(\d{2}\/\d{2}\/\d{4}(?:\s*(?:à)?\s*\d{1,2}\s*[:Hh]\s*\d{2})?)/;

  const keywordMatch = normalized.match(keywordRegex);
  if (!keywordMatch || keywordMatch.index === undefined) return null;

  const start = keywordMatch.index;
  const window = normalized.slice(start, start + 280);
  const dt = window.match(dateTimePattern);
  return dt ? dt[1] : null;
}

function extractDateTimeFromDeadlineTd(td: cheerio.Cheerio<any>): string | null {
  // 1) Preferred block
  const line = td.find(".cloture-line").first().text().replace(/\s+/g, " ").trim();
  const lineIso = parseDateTimeToLocalIso(line);
  if (lineIso) return lineIso;

  // 2) Some layouts split date/time in nested spans/divs
  const rawTdText = td.text().replace(/\s+/g, " ").trim();
  const tdIso = parseDateTimeToLocalIso(rawTdText);
  if (tdIso) return tdIso;

  // 3) Sometimes the full datetime is in tooltip attributes
  const titleLike =
    td.find("[title*='/'], [data-original-title*='/'], [aria-label*='/']").first();
  if (titleLike.length) {
    const attrText =
      titleLike.attr("title")
      ?? titleLike.attr("data-original-title")
      ?? titleLike.attr("aria-label")
      ?? "";
    const attrIso = parseDateTimeToLocalIso(attrText.replace(/\s+/g, " ").trim());
    if (attrIso) return attrIso;
  }

  // 4) Last resort: keep date with 00:00 if no hour is present anywhere
  const dateOnly = rawTdText.match(/(\d{2}\/\d{2}\/\d{4})/);
  return dateOnly ? parseDateTimeToLocalIso(dateOnly[1]) : null;
}

function extractLabeledValue($: cheerio.CheerioAPI, labelRegex: RegExp): string | null {
  const candidates: string[] = [];

  $("tr").each((_, tr) => {
    const tds = $(tr).find("td, th");
    if (tds.length < 2) return;
    const label = $(tds[0]).text().replace(/\s+/g, " ").trim();
    if (!labelRegex.test(label)) return;
    const value = $(tds[1]).text().replace(/\s+/g, " ").trim();
    if (value) candidates.push(value);
  });

  if (candidates.length) return candidates[0];

  // Fallback: search any element containing the label, then take the next sibling text
  const el = $("*").filter((_, e) => {
    const txt = $(e).text().replace(/\s+/g, " ").trim();
    return labelRegex.test(txt);
  }).first();
  if (el.length) {
    const nextText = el.parent().next().text().replace(/\s+/g, " ").trim();
    if (nextText) return nextText;
  }

  return null;
}

function parseLotsNumberFromText(text: string | null): number | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  // Match any dash-like character: hyphen, en-dash, em-dash, minus sign
  if (/^[\u002D\u2013\u2014\u2212]+$/.test(clean)) return 1;
  const m = clean.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function extractLotsTextFromDetailPage($: cheerio.CheerioAPI): string | null {
  // 1) Structured (label -> value) lookup
  const labeled =
    extractLabeledValue($, /allotissement/i) ??
    extractLabeledValue($, /nombre\s+de\s+lots/i) ??
    extractLabeledValue($, /\bnbr\s+de\s+lots\b/i);
  if (labeled) return labeled;

  // 2) DOM proximity: element containing the label, then next sibling/container text
  const labelEl = $("*").filter((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim().toLowerCase();
    return t === "allotissement" || t.startsWith("allotissement") || t === "nombre de lots" || t.startsWith("nombre de lots");
  }).first();
  if (labelEl.length) {
    const next = labelEl.next().text().replace(/\s+/g, " ").trim();
    if (next && parseLotsNumberFromText(next) !== null) return next;
    const parentNext = labelEl.parent().next().text().replace(/\s+/g, " ").trim();
    if (parentNext && parseLotsNumberFromText(parentNext) !== null) return parentNext;
    const parentText = labelEl.parent().text().replace(/\s+/g, " ").trim();
    // Sometimes label + value are in the same container: "Allotissement : -"
    const sameContainerMatch = parentText.match(/allotissement\s*:?\s*([-\u2013\u2014\u2212\d]+)/i);
    if (sameContainerMatch) return sameContainerMatch[1];
  }

  // 3) Last resort: regex on full page text
  // dashOrDigit is already a character class [...], so use it directly with a quantifier.
  const full = $("body").text().replace(/\s+/g, " ").trim();
  const dashOrDigit = "[-\u2013\u2014\u2212\\d]";
  const m =
    full.match(new RegExp(`allotissement\\s*:?\\s*(${dashOrDigit}{1,4})`, "i")) ??
    full.match(new RegExp(`nombre\\s+de\\s+lots\\s*:?\\s*(${dashOrDigit}{1,4})`, "i")) ??
    full.match(new RegExp(`\\bnbr\\s+de\\s+lots\\b\\s*:?\\s*(${dashOrDigit}{1,4})`, "i"));
  return m ? m[1] : null;
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

/** Parse French-formatted MAD amounts like "379 104,00" or "7 000,00 MAD" */
function parseMADAmount(text: string): string | null {
  const cleaned = text.replace(/\s/g, "").replace(/MAD.*$/i, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num === 0) return null;
  return num.toFixed(2);
}

// ── Portal session setup ─────────────────────────────────────────────────────

async function getInitialSession(): Promise<{ cookies: string; pradoState: string }> {
  const res = await fetchWithRetry(
    SEARCH_FORM_URL,
    { headers: HEADERS },
    { timeoutMs: TIMEOUT_FORM_MS }
  );
  if (!res.ok) throw new Error(`Portail inaccessible: HTTP ${res.status}`);

  const rawCookies = res.headers.getSetCookie?.() ?? [];
  const cookies = rawCookies.map((c: string) => c.split(";")[0]).join("; ");
  const html = await res.text();
  const pradoState = parsePradoState(html);
  if (!pradoState) throw new Error("PRADO_PAGESTATE introuvable sur la page initiale");

  return { cookies, pradoState };
}

/** PRADO AJAX callback — triggers cascade dropdown updates in the PHP session.
 *  These callbacks return only a partial HTML fragment (no PRADO_PAGESTATE),
 *  so we always fall back to the original state for subsequent requests. */
async function pradoCallback(
  cookies: string,
  pradoState: string,
  target: string,
  parameter: string,
  extraFields: Record<string, string> = {}
): Promise<string> {
  const params = new URLSearchParams({
    main_form: "",
    PRADO_PAGESTATE: pradoState,
    PRADO_CALLBACK_TARGET: target,
    PRADO_CALLBACK_PARAMETER: parameter,
    ...extraFields,
  });

  const res = await fetchWithRetry(
    SEARCH_FORM_URL,
    {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookies,
      },
      body: params.toString(),
    },
    { timeoutMs: TIMEOUT_CALLBACK_MS }
  );

  if (!res.ok) throw new Error(`Cascade portail (${target.split("$").pop()}): HTTP ${res.status}`);

  // Callbacks return partial HTML — PRADO_PAGESTATE is NOT included in the response.
  // The PHP session retains the cascade effect; we keep passing the original state.
  const newState = parsePradoState(await res.text());
  return newState || pradoState;
}

/** Submit the search form and get the results page HTML */
async function submitSearch(
  cookies: string,
  pradoState: string,
  pageSize: number
): Promise<{ html: string; pradoState: string }> {
  const params = new URLSearchParams({
    main_form: "",
    PRADO_PAGESTATE: pradoState,
    PRADO_POSTBACK_TARGET: "ctl0$CONTENU_PAGE$AdvancedSearch$lancerRecherche",
    "ctl0$CONTENU_PAGE$AdvancedSearch$type_rechercheEntite": "exact",
    "ctl0$CONTENU_PAGE$AdvancedSearch$classification": BUYER_CLASSIFICATION,
    "ctl0$CONTENU_PAGE$AdvancedSearch$organismesNames": BUYER_ORG_ACRONYME,
    "ctl0$CONTENU_PAGE$AdvancedSearch$entityPurchaseNames": BUYER_ENTITY_ID,
    "ctl0$CONTENU_PAGE$AdvancedSearch$lancerRecherche": "Lancer la recherche",
  });

  const res = await fetchWithRetry(
    SEARCH_FORM_URL,
    {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": SEARCH_FORM_URL,
        "Cookie": cookies,
      },
      body: params.toString(),
    },
    { timeoutMs: TIMEOUT_SEARCH_MS }
  );

  if (!res.ok) throw new Error(`Soumission recherche: HTTP ${res.status}`);
  const html = await res.text();
  const newState = parsePradoState(html);

  const resultsUrl = `${PORTAL_BASE}/index.php?page=entreprise.EntrepriseAdvancedSearch&AllCons&searchAnnCons`;
  const tendersFirstPage = parseTenders(html);
  const totalFound = extractTotalFound(html);
  // If we already got everything, skip the (often slow) page-size change POST.
  if (totalFound !== null && tendersFirstPage.length >= totalFound && tendersFirstPage.length > 0) {
    return { html, pradoState: newState };
  }
  // If we don't have the total counter, be conservative and avoid the 2nd request
  // when the first page already looks small (typical case: <= 30 AOs).
  if (totalFound === null && tendersFirstPage.length > 0 && tendersFirstPage.length <= pageSize) {
    return { html, pradoState: newState };
  }

  const params2 = new URLSearchParams({
    main_form: "",
    PRADO_PAGESTATE: newState,
    PRADO_POSTBACK_TARGET: "ctl0$CONTENU_PAGE$resultSearch$listePageSizeTop",
    "ctl0$CONTENU_PAGE$resultSearch$listePageSizeTop": String(pageSize),
    "ctl0$CONTENU_PAGE$resultSearch$listePageSizeBottom": String(pageSize),
  });

  const res2 = await fetchWithRetry(
    resultsUrl,
    {
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        // Referer should match the results endpoint for stability.
        "Referer": resultsUrl,
        "Cookie": cookies,
      },
      body: params2.toString(),
    },
    { timeoutMs: TIMEOUT_PAGE_SIZE_MS }
  );

  if (!res2.ok) throw new Error(`Changement taille page: HTTP ${res2.status}`);
  const html2 = await res2.text();
  return { html: html2, pradoState: parsePradoState(html2) };
}

// ── HTML parsing ─────────────────────────────────────────────────────────────

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

    // Title/Object — clone and strip hidden tooltip divs
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
    const deadlineIso = extractDateTimeFromDeadlineTd(deadlineTd);

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
      submissionDeadline: deadlineIso,
      openingDate: null,
      buyer,
      executionLocation: location || null,
      portalUrl,
      estimatedBudget: null,
      provisionalGuaranteeAmount: null,
      lotsNumber: null,
    });
  });

  return tenders;
}

// ── Detail page enrichment ───────────────────────────────────────────────────

async function fetchTenderDetail(
  refConsultation: string,
  orgAcronyme: string
): Promise<{
  estimatedBudget: string | null;
  provisionalGuaranteeAmount: string | null;
  submissionDeadline: string | null;
  openingDate: string | null;
  lotsNumber: number | null;
}> {
  const url = `${PORTAL_BASE}/index.php?page=entreprise.EntrepriseDetailsConsultation&refConsultation=${refConsultation}&orgAcronyme=${orgAcronyme}`;
  try {
    const res = await fetchWithRetry(
      url,
      { headers: HEADERS },
      { timeoutMs: TIMEOUT_DETAIL_MS, retryOnStatuses: [500, 503, 429] }
    );
    if (!res.ok) {
      return {
        estimatedBudget: null,
        provisionalGuaranteeAmount: null,
        submissionDeadline: null,
        openingDate: null,
        lotsNumber: null,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const detailText = normalizeSpaces($("body").text());

    const estSpan = $("span[id*='labelReferentielZoneText'].content-bloc").first();
    const estimatedBudget = estSpan.length ? parseMADAmount(estSpan.text()) : null;

    const cautionSpan = $("span[id*='cautionProvisoire']").first();
    const provisionalGuaranteeAmount = cautionSpan.length ? parseMADAmount(cautionSpan.text()) : null;

    // Submission deadline (date limite de remise des plis) from detail page is
    // usually more reliable than list view for preserving hour.
    let submissionDeadlineText =
      extractLabeledValue($, /date\s+limite\s+de\s+remise\s+des\s+plis/i)
      ?? extractLabeledValue($, /date\s+limite\s+de\s+r[eé]ception\s+des\s+offres/i)
      ?? extractLabeledValue($, /remise\s+des\s+plis/i);
    if (!submissionDeadlineText) {
      submissionDeadlineText =
        extractDateTimeNearKeyword(detailText, /date\s+limite\s+de\s+remise\s+des\s+plis/i)
        ?? extractDateTimeNearKeyword(detailText, /date\s+limite\s+de\s+r[eé]ception\s+des\s+offres/i)
        ?? extractDateTimeNearKeyword(detailText, /remise\s+des\s+plis/i);
    }
    const submissionDeadline = submissionDeadlineText ? parseDateTimeToLocalIso(submissionDeadlineText) : null;

    // Opening date/time (ouverture des plis)
    let openingText =
      extractLabeledValue($, /ouverture\s+des\s+plis/i)
      ?? extractLabeledValue($, /date\s+et\s+heure\s+d['’]ouverture/i)
      ?? extractLabeledValue($, /séance\s+d['’]ouverture/i);
    if (!openingText) {
      openingText =
        extractDateTimeNearKeyword(detailText, /ouverture\s+des\s+plis/i)
        ?? extractDateTimeNearKeyword(detailText, /date\s+et\s+heure\s+d['’]ouverture/i)
        ?? extractDateTimeNearKeyword(detailText, /séance\s+d['’]ouverture/i);
    }
    const openingDate = openingText ? parseDateTimeToLocalIso(openingText) : null;

    // Lots / allotissement
    const lotsText = extractLotsTextFromDetailPage($);
    const lotsNumber = parseLotsNumberFromText(lotsText);

    return { estimatedBudget, provisionalGuaranteeAmount, submissionDeadline, openingDate, lotsNumber };
  } catch {
    return {
      estimatedBudget: null,
      provisionalGuaranteeAmount: null,
      submissionDeadline: null,
      openingDate: null,
      lotsNumber: null,
    };
  }
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function scrapePortalTenders(_buyerFilter: string): Promise<{
  tenders: ScrapedTender[];
  totalFound: number;
  filtered: number;
}> {
  // Step 1: Handshake — get session cookies + initial PRADO state
  const { cookies, pradoState: state0 } = await getInitialSession();

  // Step 2: Cascade classification → organism callbacks
  //         so the server-side session reflects the correct dropdown selections
  const state1 = await pradoCallback(
    cookies, state0,
    "ctl0$CONTENU_PAGE$AdvancedSearch$classification",
    BUYER_CLASSIFICATION,
    { "ctl0$CONTENU_PAGE$AdvancedSearch$classification": BUYER_CLASSIFICATION }
  );

  const state2 = await pradoCallback(
    cookies, state1,
    "ctl0$CONTENU_PAGE$AdvancedSearch$organismesNames",
    BUYER_ORG_ACRONYME,
    {
      "ctl0$CONTENU_PAGE$AdvancedSearch$classification": BUYER_CLASSIFICATION,
      "ctl0$CONTENU_PAGE$AdvancedSearch$organismesNames": BUYER_ORG_ACRONYME,
    }
  );

  // Step 3: Submit the search form — server returns only SOUSS-MASSA results
  //         then switch to PAGE_SIZE to get all in one response
  const { html } = await submitSearch(cookies, state2, PAGE_SIZE);

  // Step 4: Parse — filter by exact buyer label (case-insensitive, normalized spaces)
  const tenders = parseTenders(html).filter((t) => {
    const buyerNorm = t.buyer.toUpperCase().trim().replace(/\s+/g, " ");
    return buyerNorm === EXPECTED_BUYER_NAME;
  });

  // Extract total from page counter
  const totalFound = extractTotalFound(html) ?? tenders.length;

  // Step 5: Enrich each tender sequentially — avoids flooding the detail pages
  for (const tender of tenders) {
    const detail = await fetchTenderDetail(tender.refConsultation, tender.orgAcronyme);
    tender.estimatedBudget = detail.estimatedBudget;
    tender.provisionalGuaranteeAmount = detail.provisionalGuaranteeAmount;
    // Prefer detail-page deadline to avoid losing hour information.
    if (detail.submissionDeadline) {
      tender.submissionDeadline = detail.submissionDeadline;
    }
    tender.openingDate = detail.openingDate;
    tender.lotsNumber = detail.lotsNumber;
    await sleep(DETAIL_DELAY_MS);
  }

  return {
    tenders,
    totalFound,
    filtered: tenders.length,
  };
}
