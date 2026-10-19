import { GoogleGenAI, Type, Schema } from '@google/genai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { normalizeEquipmentType } from '../constants/load-types';

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || 'dummy_key' });
const GEMINI_FLASH_MODELS = [
  env.GEMINI_MODEL_PRIMARY,
  env.GEMINI_MODEL_FALLBACK_1,
  env.GEMINI_MODEL_FALLBACK_2,
].filter((model, index, models) => Boolean(model) && models.indexOf(model) === index);

type ExtractionMethod = 'text_layer' | 'image_multimodal';
type Stop = {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  date: string | null;
  time_window: string | null;
  contact: string | null;
  phone?: string | null;
  instructions: string | null;
};

const PHONE_PATTERN = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-](\d{4})/;

export const splitContactPhone = (value?: string | null) => {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) return { contact: undefined, phone: undefined };
  const match = cleaned.match(PHONE_PATTERN);
  if (!match) return { contact: cleaned, phone: undefined };

  const phone = `(${match[1]}) ${match[2]}-${match[3]}`;
  const contact = cleaned
    .replace(match[0], '')
    .replace(/\s*[•|,:;\-]\s*$/, '')
    .replace(/^\s*[•|,:;\-]\s*/, '')
    .trim();
  return { contact: contact || undefined, phone };
};

export const normalizeUSDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;

  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!usMatch) return undefined;
  const month = Number(usMatch[1]);
  const day = Number(usMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${usMatch[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const cleanOptionalText = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return !cleaned || /^(?:null|undefined|n\/a)$/i.test(cleaned) ? undefined : cleaned;
};

export interface RateConfirmationDocument {
  document_type: 'rate_confirmation' | 'bol' | 'invoice' | 'unknown';
  broker_name: string | null;
  broker_mc: string | null;
  carrier_name: string | null;
  carrier_mc: string | null;
  load_id: string | null;
  carrier_pro: string | null;
  bol_number: string | null;
  pickup_stops: Stop[];
  delivery_stops: Stop[];
  equipment_type: string | null;
  commodity: string | null;
  weight: number | null;
  miles: number | null;
  total_rate: number | null;
  equipment_type_raw?: string | null;
  rate_type: 'flat' | 'per_mile' | null;
  detention_terms: string | null;
  fuel_surcharge: number | null;
  accessorials: string[];
  payment_terms: string | null;
  special_instructions: string | null;
  _meta: {
    extraction_method: ExtractionMethod;
    field_confidence: Record<string, number>;
    overall_confidence: number;
  };
}

export class AIService {
  private readonly extractionFields = [
    'carrier_mc', 'carrier_name', 'customer_broker_name', 'load_id', 'carrier_pro', 'customer_po',
    'pickup_date', 'pickup_time_window', 'delivery_date', 'delivery_time_window',
    'origin_city', 'origin_state', 'origin_zip', 'destination_city', 'destination_state', 'destination_zip',
    'equipment_type', 'commodity', 'weight', 'pieces', 'total_rate', 'rate_type', 'miles',
    'fuel_surcharge', 'detention_rate', 'detention_hours', 'lumper_fee', 'tonu', 'accessorials', 'rate_per_mile', 'payment_terms',
    'special_instructions'
  ] as const;

  private normalizeNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return value == null ? null : Number(value) || null;
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeTimeValue(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const compactMatch = trimmed.match(/^(\d{3,4})\s*(AM|PM)?$/i);
    const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!compactMatch && !colonMatch) return null;

    let hour = Number(colonMatch ? colonMatch[1] : compactMatch![1].slice(0, -2));
    const minute = colonMatch ? Number(colonMatch[2]) : Number(compactMatch![1].slice(-2));
    const meridiem = (colonMatch?.[3] || compactMatch?.[2])?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private async generateContentWithRetry(request: any): Promise<any> {
    const retryDelaysMs = [2000, 4000, 8000];
    let lastError: unknown;

    for (const model of GEMINI_FLASH_MODELS) {
      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        try {
          return await ai.models.generateContent({ ...request, model });
        } catch (error: any) {
          lastError = error;
          const status = Number(error?.status || error?.code || error?.error?.code);
          const message = String(error?.message || error?.error?.message || '');
          const timeout = /timeout|timed out|deadline exceeded|ETIMEDOUT/i.test(message) || error?.code === 'ETIMEDOUT';
          const unavailable = status === 404 || /\b404\b/.test(message);
          const overloaded = status === 429 || status === 503 || /\b(429|503)\b/.test(message);

          if (!unavailable && !overloaded && !timeout) throw error;
          if (unavailable || timeout || attempt === retryDelaysMs.length) {
            const reason = timeout ? 'timeout' : status || 'temporary failure';
            const nextModel = GEMINI_FLASH_MODELS[GEMINI_FLASH_MODELS.indexOf(model) + 1];
            logger.warn(`Gemini fallback: model=${model} reason=${reason} replacement=${nextModel || 'none'}`);
            break;
          }

          const delay = retryDelaysMs[attempt];
          logger.warn(`Gemini retry: model=${model} reason=${status || 'temporary failure'} attempt=${attempt + 2} delay=${delay / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError && !this.isProviderAvailabilityError(lastError)) throw lastError;
    throw new Error('Huduma ya AI ina shughuli nyingi kwa sasa, tafadhali jaribu tena baada ya muda mfupi');
  }

  private isProviderAvailabilityError(error: any): boolean {
    const status = Number(error?.status || error?.code || error?.error?.code);
    const message = String(error?.message || error?.error?.message || '');
    return status === 404 || status === 429 || status === 503 || /\b(404|429|503)\b/.test(message) || /timeout|timed out|deadline exceeded|ETIMEDOUT/i.test(message);
  }

  private extractVerifiedBrokerMc(text: string): string | undefined {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const carrierSectionIndex = lines.findIndex((line) =>
      /^(?:CARRIER\s+(?:CONTACT|INFORMATION)|CARRIER\s*:)|\bMC\s*\/\s*DOT\s*#/i.test(line)
    );
    const signatureSectionIndex = lines.findIndex((line) =>
      /^(?:Carrier|Driver)\s+Signature\b|^Please\s+sign\b/i.test(line)
    );
    const endIndex = Math.min(
      carrierSectionIndex >= 0 ? carrierSectionIndex : lines.length,
      signatureSectionIndex >= 0 ? signatureSectionIndex : lines.length,
    );
    const brokerLines = lines.slice(0, endIndex);
    const brokerNameIndex = brokerLines.findIndex((line) => /^(?:Bill\s*To|Broker)\s*:/i.test(line));
    const brokerContextStart = brokerNameIndex >= 0 ? brokerNameIndex : 0;
    const brokerContextEnd = brokerNameIndex >= 0 ? brokerNameIndex + 4 : brokerLines.length;

    for (let index = brokerContextStart; index < Math.min(brokerContextEnd, brokerLines.length); index += 1) {
      const line = brokerLines[index];
      if (/\bcarrier\b|\bdriver\b|\bDOT\b/i.test(line)) continue;
      const match = line.match(/(?:\bBroker\s+)?MC\s*(?:(?:#|Number)\s*[:#-]?|-)\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)/i)
        || line.match(/\bMotor\s+Carrier\s+Number\s*[:#-]?\s*([A-Z0-9]+(?:-[A-Z0-9]+)*)/i);
      if (match?.[1]) return match[1].trim();
    }

    return undefined;
  }

  private parseCdlText(text: string) {
    const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    const getValue = (patterns: RegExp[]) => {
      for (const pattern of patterns) {
        const match = normalized.match(pattern);
        const value = match?.[1]?.trim().replace(/\s+/g, ' ');
        if (value && !/^[_\s-]+$/.test(value)) return value;
      }
      return undefined;
    };
    const getDate = (patterns: RegExp[]) => {
      const value = getValue(patterns);
      if (!value) return undefined;
      return normalizeUSDate(value) || undefined;
    };

    return {
      license_number: getValue([/(?:CDL|Driver'?s?\s+License)\s*(?:Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/i, /\bDL\s*(?:Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9-]+)/i]),
      license_state: getValue([/(?:State|Jurisdiction)\s*(?:of\s+)?(?:Issue|Issuing)?\s*[:#-]\s*([A-Z]{2})\b/i, /\b(?:STATE|ST)\s*[:#-]\s*([A-Z]{2})\b/i]),
      cdl_class: getValue([/\b(?:CDL\s+)?Class\s*[:#-]\s*([A-Z])\b/i]),
      cdl_endorsements: getValue([/\bEndorsements?\s*[:#-]\s*([^\r\n]+)/i]),
      cdl_restrictions: getValue([/\bRestrictions?\s*[:#-]\s*([^\r\n]+)/i]),
      cdl_issue_date: getDate([/\b(?:Issue|Issued|ISS)\s*Date\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i]),
      license_expiry: getDate([/\b(?:Expiration|Expires?|EXP)\s*Date?\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i]),
      date_of_birth: getDate([/\b(?:Date\s+of\s+Birth|DOB|Birth\s+Date)\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i]),
    };
  }

  async extractCdlDocument(input: { text?: string; imagePages?: Buffer[]; imageMimeType?: string }) {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy_key') {
      return this.parseCdlText(input.text || '');
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        license_number: { type: Type.STRING },
        license_state: { type: Type.STRING },
        cdl_class: { type: Type.STRING },
        cdl_endorsements: { type: Type.STRING },
        cdl_restrictions: { type: Type.STRING },
        cdl_issue_date: { type: Type.STRING },
        license_expiry: { type: Type.STRING },
        date_of_birth: { type: Type.STRING },
      },
    };
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{
      text: 'Extract only clearly visible information from this driver license/CDL. Return null for missing or unclear fields; never guess. Use the CDL/document number, issuing state, class, endorsements, restrictions, issue date, expiration date, and date of birth. Dates must be YYYY-MM-DD. Do not extract or infer medical-card expiration or clearinghouse renewal date.',
    }];
    if (input.text) parts.push({ text: `OCR/document text:\n${input.text}` });
    for (const image of input.imagePages || []) {
      const mimeType = input.imageMimeType === 'image/jpeg' || input.imageMimeType === 'image/png' || input.imageMimeType === 'image/webp'
        ? input.imageMimeType
        : 'image/png';
      parts.push({ inlineData: { mimeType, data: image.toString('base64') } });
    }
    const response = await this.generateContentWithRetry({
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
    });
    if (!response.text) return {};

    const parsed = JSON.parse(response.text) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const field of ['license_number', 'license_state', 'cdl_class', 'cdl_endorsements', 'cdl_restrictions']) {
      if (typeof parsed[field] === 'string' && parsed[field].trim()) result[field] = parsed[field].trim();
    }
    for (const field of ['cdl_issue_date', 'license_expiry', 'date_of_birth']) {
      if (typeof parsed[field] !== 'string') continue;
      const date = normalizeUSDate(parsed[field]);
      if (date) result[field] = date;
    }
    return result;
  }

  async extractRateConfirmationDocument(input: {
    text?: string;
    imagePages?: Buffer[];
    extractionMethod: ExtractionMethod;
  }): Promise<RateConfirmationDocument> {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy_key') {
      if (!input.text) return this.emptyRateConfirmationDocument(input.extractionMethod);
      return this.normalizeLegacyDocument(await this.extractRateConfirmation(input.text), input.extractionMethod);
    }

    const stopSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING },
        state: { type: Type.STRING }, zip: { type: Type.STRING }, date: { type: Type.STRING },
        time_window: { type: Type.STRING }, contact: { type: Type.STRING }, instructions: { type: Type.STRING },
      },
    };
    const confidenceProperties = Object.fromEntries([
      'broker_name', 'broker_mc', 'carrier_name', 'carrier_mc', 'load_id', 'carrier_pro', 'bol_number',
      'pickup_stops', 'delivery_stops', 'equipment_type', 'commodity', 'weight', 'miles', 'total_rate',
      'rate_type', 'detention_terms', 'fuel_surcharge', 'accessorials', 'payment_terms', 'special_instructions',
    ].map((field) => [field, { type: Type.NUMBER }]));
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        document_type: { type: Type.STRING, enum: ['rate_confirmation', 'bol', 'invoice', 'unknown'] },
        broker_name: { type: Type.STRING }, broker_mc: { type: Type.STRING }, carrier_name: { type: Type.STRING }, carrier_mc: { type: Type.STRING },
        load_id: { type: Type.STRING }, carrier_pro: { type: Type.STRING }, bol_number: { type: Type.STRING },
        pickup_stops: { type: Type.ARRAY, items: stopSchema }, delivery_stops: { type: Type.ARRAY, items: stopSchema },
        equipment_type: { type: Type.STRING }, commodity: { type: Type.STRING }, weight: { type: Type.NUMBER },
        miles: { type: Type.NUMBER }, total_rate: { type: Type.NUMBER },
        rate_type: { type: Type.STRING, enum: ['flat', 'per_mile'] },
        detention_terms: { type: Type.STRING }, fuel_surcharge: { type: Type.NUMBER },
        accessorials: { type: Type.ARRAY, items: { type: Type.STRING } }, payment_terms: { type: Type.STRING },
        special_instructions: { type: Type.STRING },
        _meta: {
          type: Type.OBJECT,
          properties: {
            extraction_method: { type: Type.STRING, enum: ['text_layer', 'image_multimodal'] },
            field_confidence: { type: Type.OBJECT, properties: confidenceProperties },
            overall_confidence: { type: Type.NUMBER },
          },
        },
      },
    };
    const prompt = `Extract this logistics document into the supplied JSON schema. If a field is not present in the document, return null. Do not invent, infer, inherit, or hallucinate missing values. Preserve all stop rows, table values, signatures, and instructions that are actually visible. Normalize dates to YYYY-MM-DD, money to numeric USD, weight to pounds, and confidence scores to 0 through 1 for every field.\n\nBroker and carrier separation: find the broker or logistics company on the document letterhead, page header, "Bill To", "Broker", dispatcher section, or broker MC section. Preserve the complete visible legal/company name. A carrier MC#/DOT# belongs in carrier_mc (or carrier_pro only when it is explicitly a PRO number), never broker_mc. If the broker's own MC number is not explicitly labeled or clearly associated with the broker, return broker_mc as null. Never copy a carrier MC, DOT, billing/mailing address ZIP, broker contact, or any unrelated document value into a missing broker field.\n\nStop identification: map stop labels and aliases into the two schema arrays. Pickup aliases include PU, PICKUP, PICK UP, SHIPPER, ORIGIN, and PICKUP LOCATION; delivery aliases include SO (including SO 1/SO 2), SHIP-TO, DELIVERY, DROP, CONSIGNEE, DESTINATION, and DELIVERY LOCATION. A row labeled SO is a delivery stop even when the document does not spell out the word delivery. For each stop, copy facility name, address, city, state, ZIP, date, time window, contact, and instructions only from that same stop row/block. ZIP must be null when that stop's own location has no ZIP; never use a ZIP from a carrier, billing, funding, letterhead, or mailing address. Stop contact must be null unless a person/phone is explicitly inside that stop's own block; never use the broker/dispatcher contact for pickup or delivery. Do not discard a stop because its label uses PU or SO.\n\nFor miles, inspect labels and tables including "Miles:", "Loaded Miles", "Total Miles", "Mileage", and the Order shipment table. For total_rate, inspect "Rate", "Carrier Freight Pay", "Total Carrier Pay", "Line Haul", and "TOTAL"; convert values such as "$1,700.00" to the number 1700. Do not return null for these fields when the labeled value is visible. The extraction method is ${input.extractionMethod}.`;
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
    if (input.text) parts.push({ text: `Document text:\n${input.text}` });
    for (const image of input.imagePages || []) {
      parts.push({ inlineData: { mimeType: 'image/png', data: image.toString('base64') } });
    }
    const response = await this.generateContentWithRetry({
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
    });
    if (!response.text) return this.emptyRateConfirmationDocument(input.extractionMethod);
    const parsed = JSON.parse(response.text) as Partial<RateConfirmationDocument>;
    const normalized = {
      ...this.emptyRateConfirmationDocument(input.extractionMethod),
      ...parsed,
      pickup_stops: parsed.pickup_stops || [],
      delivery_stops: parsed.delivery_stops || [],
      accessorials: parsed.accessorials || [],
      _meta: {
        extraction_method: input.extractionMethod,
        field_confidence: parsed._meta?.field_confidence || {},
        overall_confidence: parsed._meta?.overall_confidence || 0,
      },
    };
    normalized.broker_mc = input.text ? this.extractVerifiedBrokerMc(input.text) || null : null;
    normalized.miles = this.normalizeNumeric(parsed.miles);
    normalized.total_rate = this.normalizeNumeric(parsed.total_rate);
    normalized.weight = this.normalizeNumeric(parsed.weight);
    normalized.fuel_surcharge = this.normalizeNumeric(parsed.fuel_surcharge);
    return normalized;
  }

  toLegacyRateConfirmation(document: RateConfirmationDocument) {
    const toLegacyStop = (stop: Stop, type: 'pickup' | 'delivery') => ({
      type,
      facilityName: cleanOptionalText(stop.name),
      address: cleanOptionalText(stop.address),
      city: cleanOptionalText(stop.city),
      state: cleanOptionalText(stop.state),
      zip: cleanOptionalText(stop.zip),
      date: cleanOptionalText(stop.date),
      time: (() => {
        const [rawStart, rawEnd] = (stop.time_window || '').split(/\s*[-–]\s*/);
        const start = this.normalizeTimeValue(rawStart);
        const end = this.normalizeTimeValue(rawEnd);
        return start ? `${start}${end ? ` - ${end}` : ''}` : stop.time_window || undefined;
      })(),
      timeStart: this.normalizeTimeValue((stop.time_window || '').split(/\s*[-–]\s*/)[0]) || undefined,
      timeEnd: this.normalizeTimeValue((stop.time_window || '').split(/\s*[-–]\s*/)[1]) || undefined,
      ...(() => {
        const split = splitContactPhone(stop.contact);
        return {
          contact: cleanOptionalText(stop.contact) ? split.contact : undefined,
          phone: cleanOptionalText(stop.phone) || split.phone,
        };
      })(),
    });
    const stops = [
      ...document.pickup_stops.map((stop) => toLegacyStop(stop, 'pickup')),
      ...document.delivery_stops.map((stop) => toLegacyStop(stop, 'delivery')),
    ];
    const pickup = stops.find((stop) => stop.type === 'pickup');
    const delivery = stops.find((stop) => stop.type === 'delivery');
    const equipment = normalizeEquipmentType(document.equipment_type);
    return {
      loadNumber: document.load_id || undefined,
      brokerName: cleanOptionalText(document.broker_name),
      brokerMC: cleanOptionalText(document.broker_mc),
      carrier: cleanOptionalText(document.carrier_name),
      carrierMC: cleanOptionalText(document.carrier_mc),
      brokerReference: document.bol_number || undefined,
      commodity: document.commodity || undefined,
      equipmentType: equipment.equipmentType,
      equipmentTypeRaw: document.equipment_type_raw || equipment.raw,
      rate: document.total_rate ?? undefined,
      weight: document.weight ?? undefined,
      miles: document.miles ?? undefined,
      specialInstructions: document.special_instructions || undefined,
      pickup,
      delivery,
      stops,
      confidence: document._meta.field_confidence,
      reviewStatus: document._meta.overall_confidence < 0.85 ? 'needs_review' : 'ready',
    };
  }

  private emptyRateConfirmationDocument(extractionMethod: ExtractionMethod): RateConfirmationDocument {
    return {
      document_type: 'unknown', broker_name: null, broker_mc: null, carrier_name: null, carrier_mc: null, load_id: null,
      carrier_pro: null, bol_number: null, pickup_stops: [], delivery_stops: [], equipment_type: null, equipment_type_raw: null,
      commodity: null, weight: null, miles: null, total_rate: null, rate_type: null, detention_terms: null,
      fuel_surcharge: null, accessorials: [], payment_terms: null, special_instructions: null,
      _meta: { extraction_method: extractionMethod, field_confidence: {}, overall_confidence: 0 },
    };
  }

  private normalizeLegacyDocument(legacy: any, extractionMethod: ExtractionMethod): RateConfirmationDocument {
    const stop = (value: any): Stop => ({
      name: value?.facilityName || null,
      address: value?.address || null,
      city: value?.city || null,
      state: value?.state || null,
      zip: value?.zip || null,
      date: value?.date || null,
      time_window: value?.time || null,
      contact: value?.contact || null,
      instructions: null,
    });
    const pickup = legacy.pickup?.city || legacy.pickup?.address ? [stop(legacy.pickup)] : [];
    const delivery = legacy.delivery?.city || legacy.delivery?.address ? [stop(legacy.delivery)] : [];
    const confidence: Record<string, number> = {};
    for (const [key, value] of Object.entries({
      broker_name: legacy.brokerName, carrier_name: legacy.carrier, load_id: legacy.loadNumber,
      commodity: legacy.commodity, weight: legacy.weight, miles: legacy.miles, total_rate: legacy.rate,
      pickup_stops: pickup, delivery_stops: delivery,
    })) confidence[key] = value === undefined ? 0 : 0.86;
    return {
      document_type: 'rate_confirmation', broker_name: cleanOptionalText(legacy.brokerName) || null, broker_mc: cleanOptionalText(legacy.brokerMC) || null,
      carrier_name: cleanOptionalText(legacy.carrier) || null, carrier_mc: cleanOptionalText(legacy.carrierMC) || null, load_id: legacy.loadNumber || null, carrier_pro: null,
      bol_number: legacy.brokerReference || null, pickup_stops: pickup, delivery_stops: delivery,
      equipment_type: normalizeEquipmentType(legacy.equipmentType).equipmentType,
      equipment_type_raw: legacy.equipmentTypeRaw || legacy.equipmentType || null,
      commodity: legacy.commodity || null,
      weight: legacy.weight ?? null, miles: legacy.miles ?? null, total_rate: legacy.rate ?? null,
      rate_type: legacy.rate && legacy.miles ? 'flat' : null, detention_terms: null, fuel_surcharge: null,
      accessorials: [], payment_terms: null, special_instructions: legacy.specialInstructions || null,
      _meta: { extraction_method: extractionMethod, field_confidence: confidence, overall_confidence: 0.86 },
    };
  }

  async classifyDocument(text: string): Promise<'RATE_CONFIRMATION' | 'BOL' | 'INVOICE' | 'OTHER'> {
    const normalized = text.toLowerCase();
    if (/rate confirmation|carrier rate|load confirmation|rate con/.test(normalized)) return 'RATE_CONFIRMATION';
    if (/bill of lading|b\.?o\.?l\.?|shipper.*consignee/.test(normalized)) return 'BOL';
    if (/invoice|amount due|invoice number/.test(normalized)) return 'INVOICE';

    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy_key') return 'OTHER';
    const response = await this.generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: `Classify this logistics document as exactly one of RATE_CONFIRMATION, BOL, INVOICE, OTHER. Return only the label.\n\n${text.slice(0, 12000)}` }] }],
      config: { temperature: 0 },
    });
    const label = response.text?.trim().toUpperCase();
    return label === 'RATE_CONFIRMATION' || label === 'BOL' || label === 'INVOICE' ? label : 'OTHER';
  }

  async extractStructuredDocument(text: string, documentType?: string) {
    const classifiedType = (documentType as 'RATE_CONFIRMATION' | 'BOL' | 'INVOICE' | undefined)
      || await this.classifyDocument(text);
    const legacy = await this.extractRateConfirmation(text);
    const value = (candidate: unknown, confidence = candidate === undefined || candidate === null || candidate === '' ? 0 : 0.86) => ({
      value: candidate ?? null,
      confidence,
    });
    const fields: Record<string, { value: unknown; confidence: number }> = {
      carrier_mc: value(legacy.carrierMC), carrier_name: value(legacy.carrier),
      customer_broker_name: value(legacy.brokerName), load_id: value(legacy.loadNumber),
      carrier_pro: value(undefined), customer_po: value(legacy.brokerReference),
      pickup_date: value(legacy.pickup?.date), pickup_time_window: value(legacy.pickup?.time),
      delivery_date: value(legacy.delivery?.date), delivery_time_window: value(legacy.delivery?.time),
      origin_city: value(legacy.pickup?.city), origin_state: value(legacy.pickup?.state), origin_zip: value(legacy.pickup?.zip),
      destination_city: value(legacy.delivery?.city), destination_state: value(legacy.delivery?.state), destination_zip: value(legacy.delivery?.zip),
      equipment_type: value(legacy.equipmentType), commodity: value(legacy.commodity), weight: value(legacy.weight),
      pieces: value(undefined), total_rate: value(legacy.rate), rate_type: value(legacy.rate && legacy.miles ? 'flat' : undefined),
      miles: value(legacy.miles), fuel_surcharge: value(undefined), detention_rate: value(undefined),
      detention_hours: value(undefined), lumper_fee: value(undefined), tonu: value(undefined), accessorials: value([]),
      rate_per_mile: value(legacy.rate && legacy.miles ? Number(legacy.rate) / Number(legacy.miles) : undefined), payment_terms: value(undefined),
      special_instructions: value(legacy.specialInstructions),
    };

    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'dummy_key') {
      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          document_type: { type: Type.STRING, enum: ['RATE_CONFIRMATION', 'BOL', 'INVOICE', 'OTHER'] },
          fields: {
            type: Type.OBJECT,
            properties: Object.fromEntries(this.extractionFields.map((field) => [field, {
              type: Type.OBJECT,
              properties: { value: { type: Type.STRING }, confidence: { type: Type.NUMBER } },
            }])),
          },
        },
      };
      const response = await this.generateContentWithRetry({
        contents: [{ role: 'user', parts: [{ text: `Extract this zero-template logistics document. Use null for missing values, never guess, normalize dates to YYYY-MM-DD, money to USD numbers, weight to pounds, and return a confidence from 0 to 1 for every field. Document type is ${classifiedType}.\n\n${text}` }] }],
        config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        Object.assign(fields, parsed.fields || {});
        return { document_type: parsed.document_type || classifiedType, fields };
      }
    }

    return { document_type: classifiedType, fields };
  }

  async extractRateConfirmationPdf(buffer: Buffer) {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy_key') {
      throw new Error('Scanned PDF extraction requires GEMINI_API_KEY. Add the key to backend/.env and restart the backend.');
    }

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        loadNumber: { type: Type.STRING },
        brokerReference: { type: Type.STRING },
        brokerName: { type: Type.STRING },
        brokerMC: { type: Type.STRING },
        commodity: { type: Type.STRING },
        equipmentType: { type: Type.STRING, enum: ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'TANKER', 'POWER_ONLY', 'BOX_TRUCK', 'OTHER'] },
        rate: { type: Type.NUMBER },
        weight: { type: Type.NUMBER },
        miles: { type: Type.NUMBER },
        specialInstructions: { type: Type.STRING },
        pickup: {
          type: Type.OBJECT,
          properties: {
            facilityName: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING }, state: { type: Type.STRING }, zip: { type: Type.STRING }, date: { type: Type.STRING }, time: { type: Type.STRING }, contact: { type: Type.STRING }, phone: { type: Type.STRING },
          },
        },
        delivery: {
          type: Type.OBJECT,
          properties: {
            facilityName: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING }, state: { type: Type.STRING }, zip: { type: Type.STRING }, date: { type: Type.STRING }, time: { type: Type.STRING }, contact: { type: Type.STRING }, phone: { type: Type.STRING },
          },
        },
      },
    };

    const response = await this.generateContentWithRetry({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Read this rate confirmation PDF, including scanned/image pages. Extract only the shipment data needed to create a load. Dates must be YYYY-MM-DD, preserve the broker load/order number, and do not invent missing values.' },
          { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
        ],
      }],
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
    });

    if (!response.text) throw new Error('Gemini returned no shipment data from the PDF');
    return JSON.parse(response.text);
  }

  /**
   * Extracts load details from raw text (e.g. from a Rate Confirmation PDF)
   */
  async extractRateConfirmation(text: string) {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'dummy_key') {
      logger.info('GEMINI_API_KEY is not set. Using deterministic PDF extraction.');
      return this.parseRateConfirmation(text);
    }

    try {
      const schema: Schema = {
        type: Type.OBJECT,
        properties: {
          loadNumber: { type: Type.STRING, description: 'The load number or order number' },
          brokerReference: { type: Type.STRING, description: 'The broker reference number' },
          brokerName: { type: Type.STRING, description: 'Name of the broker company' },
          brokerMC: { type: Type.STRING, description: 'Broker MC number' },
          commodity: { type: Type.STRING, description: 'The commodity being hauled' },
          equipmentType: {
            type: Type.STRING,
            description: 'Equipment type (e.g., DRY_VAN, REEFER, FLATBED)',
            enum: ['DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'TANKER', 'POWER_ONLY', 'BOX_TRUCK', 'OTHER']
          },
          rate: { type: Type.NUMBER, description: 'The total rate/pay for the load in USD' },
          weight: { type: Type.NUMBER, description: 'The total weight in lbs' },
          miles: { type: Type.NUMBER, description: 'The total loaded miles' },
          specialInstructions: { type: Type.STRING, description: 'Any special instructions or notes' },
          pickup: {
            type: Type.OBJECT,
            properties: {
              facilityName: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zip: { type: Type.STRING },
              date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
              time: { type: Type.STRING, description: 'Time or time range (e.g., 08:00 AM or 08:00 AM - 12:00 PM)' },
              contact: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          },
          delivery: {
            type: Type.OBJECT,
            properties: {
              facilityName: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              zip: { type: Type.STRING },
              date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
              time: { type: Type.STRING, description: 'Time or time range (e.g., 08:00 AM or 08:00 AM - 12:00 PM)' },
              contact: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          }
        },
      };

      const response = await this.generateContentWithRetry({
        contents: [
          { role: 'user', parts: [{ text: `Extract the load details from the following rate confirmation text:\n\n${text}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
        }
      });

      if (!response.text) {
        throw new Error('AI returned empty response');
      }

      const extracted = JSON.parse(response.text);
      extracted.brokerMC = this.extractVerifiedBrokerMc(text);
      return extracted;
    } catch (error) {
      logger.error('Failed to extract data using AI:', error);
      if (error instanceof Error && error.message === 'Huduma ya AI ina shughuli nyingi kwa sasa, tafadhali jaribu tena baada ya muda mfupi') {
        throw error;
      }
      throw new Error('Failed to extract data from document');
    }
  }

  private parseRateConfirmation(text: string) {
    const normalized = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/\t/g, ' ');
    const compactWhitespace = (value?: string) => value?.replace(/\s+/g, ' ').trim();
    const parseNumber = (value?: string) => {
      if (!value) return undefined;
      const cleaned = value.replace(/[$,%\s,]/g, '');
      if (!cleaned || Number.isNaN(Number(cleaned))) return undefined;
      return Number(cleaned);
    };
    const parseDate = normalizeUSDate;
    const parseTime = (value?: string) => {
      if (!value) return undefined;
      const clock = '(?:\\d{1,2}:\\d{2}\\s*(?:AM|PM)?|\\d{1,2}\\s*(?:AM|PM))';
      const compactWindow = '\\d{3,4}\\s*[-–]\\s*\\d{3,4}';
      const match = value.match(new RegExp(`(${clock}(?:\\s*[-–]\\s*${clock})?|${compactWindow})`, 'i'));
      return match ? match[1].replace(/\s+/g, ' ').trim() : undefined;
    };
    const normalizeTimeValue = (value?: string) => {
      if (!value) return undefined;
      const match = value.trim().match(/^(\d{1,2})(?::(\d{2})|(\d{2}))?\s*(AM|PM)?$/i);
      if (!match) return undefined;
      let hour = Number(match[1]);
      const minute = match[2] || match[3] || '00';
      const meridiem = match[4]?.toUpperCase();
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      return `${String(hour).padStart(2, '0')}:${minute}`;
    };
    const parseTimeWindow = (value?: string) => {
      const parsed = parseTime(value);
      if (!parsed) return { time: undefined, timeStart: undefined, timeEnd: undefined };
      const parts = parsed.split(/\s*[-–]\s*/);
      return { time: parsed, timeStart: normalizeTimeValue(parts[0]), timeEnd: normalizeTimeValue(parts[1]) };
    };
    const looksLikeCityStateZip = (line: string) => /[A-Za-z][A-Za-z .'-]+\s*,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/.test(line);
    const looksLikePhone = (line: string) => PHONE_PATTERN.test(line);
    const looksLikeDate = (line: string) => /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line) || /\d{4}-\d{2}-\d{2}/.test(line);
    const getFirstMatch = (patterns: RegExp[]) => {
      for (const pattern of patterns) {
        const safePattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));
        const match = normalized.match(safePattern);
        if (match?.[1]) return compactWhitespace(match[1]);
      }
      return undefined;
    };

    const firstBusinessName = (() => {
      const lines = normalized
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      const firstMetadataLine = lines.findIndex((line) => /Carrier Name|Load\s*#|MC\s*#|Pickup\s*Date|Delivery\s*Date|Shipper Information|Consignee Information|Service Level|Trailer Type|Rate:|TOTAL:/i.test(line));
      const candidateLines = firstMetadataLine >= 0 ? lines.slice(0, firstMetadataLine) : lines.slice(0, 12);

      for (const line of candidateLines) {
        if (!/^[A-Z][A-Za-z0-9&.,'()\/ -]+$/.test(line)) continue;
        if (/\d/.test(line)) continue;
        if (/^(?:TRUCKLOAD RATE CONFIRMATION|via|and|the|carrier|this|please|send|if|when|failure|late|no|payment|delivery|pickup|invoice|billing|westmont|billing email|please sign|this confirmation|send invoicing|address)$/i.test(line)) continue;
        if (/^(?:[A-Z]{2}\s+\d{5}(?:-\d{4})?)$/i.test(line)) continue;
        return line;
      }

      return undefined;
    })();

    const stripLegalNoise = (value?: string) => {
      if (!value) return undefined;
      return compactWhitespace(
        value
          .replace(/(?:Shipper|Consignee)\s+Information\s*:\s*/gi, ' ')
          .replace(/(?:Name|Address|Contact|Phone|Reference Number|Delivery Date|Pick Up Date|Shipper Ref|Customer PO)\s*[:\-]?\s*/gi, ' ')
          .replace(/\b[A-Z][A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/g, ' ')
          .replace(/\b(?:PICK UP|DELIVERY)\s*INSTRUCTIONS?\s*:/gi, ' ')
          .replace(/\bThis confirmation governs.*$/is, ' ')
          .replace(/\bCarrier Signature.*$/is, ' ')
          .replace(/\bSend Invoicing to.*$/is, ' ')
          .replace(/\s{2,}/g, ' ')
      ) || undefined;
    };

    const parseLocationBlock = (block: string, dateTimeMatch: RegExp) => {
      const lines = block
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      const addressLine = lines.find((line) => /\d+\s+[A-Za-z0-9#.&'\-\/]+/.test(line)
        && !looksLikePhone(line)
        && !looksLikeDate(line)
        && !/\b(?:units?|quantity|commodity|notes?)\b/i.test(line));
      const cityStateZipLine = lines.find((line) => looksLikeCityStateZip(line));
      const cityStateMatch = cityStateZipLine?.match(/([A-Za-z][A-Za-z .'-]+?)\s*,?\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
      const dateMatch = block.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      const timeMatch = block.match(dateTimeMatch);
      const parsedBlockTime = parseTime(block);

      const normalizedAddress = compactWhitespace(
        addressLine
          ?.replace(/^\s*(?:Name|Address|Contact|Phone)\s*:\s*/gi, '')
          .replace(/\s*Phone\s*:\s*.*$/i, '')
          .replace(/\s*Contact\s*:\s*.*$/i, '')
      );

      const contactLine = lines.find((line) => looksLikePhone(line));
      const contactDetails = splitContactPhone(contactLine);

      const timeWindow = parseTimeWindow(timeMatch?.[2] || timeMatch?.[1] || parsedBlockTime);
      const facilityName = lines.find((line) =>
        line !== normalizedAddress &&
        line !== cityStateZipLine &&
        !looksLikePhone(line) &&
        !looksLikeDate(line) &&
        !/^\d{1,2}:\d{2}/.test(line) &&
        !/^(?:Name|Address|Contact|Phone|Reference Number|Date|Time)\s*:/i.test(line)
      );

      return {
        facilityName: compactWhitespace(facilityName),
        address: normalizedAddress || undefined,
        city: cityStateMatch?.[1]?.trim() || undefined,
        state: cityStateMatch?.[2]?.trim() || undefined,
        zip: cityStateMatch?.[3]?.trim() || undefined,
        date: parseDate(dateMatch?.[1]) || undefined,
        time: timeWindow.time,
        timeStart: timeWindow.timeStart,
        timeEnd: timeWindow.timeEnd,
        phone: contactDetails.phone,
        contact: contactDetails.contact,
      };
    };

    let loadNumber = getFirstMatch([/(?:Load\s*#|Load\s*Number|Reference\s*Number|PO\s*#)\s*[:\-]?\s*([A-Z0-9-]+)/i]);
    const brokerName = /\bTQL\s+RATE\s+CONFIRMATION\b/i.test(normalized) ? 'TQL' : getFirstMatch([
      /^\s*Bill\s*To\s*:\s*([A-Za-z0-9&.,'()\/ -]+)$/gim,
      /^\s*Broker\s*:\s*([A-Za-z0-9&.,'()\/ -]+)$/gim,
    ]) || getFirstMatch([/(?:^|\n)\s*((?:AXLE|TQL|SOLVLOGIX|LOGISTIC DYNAMICS)[A-Za-z0-9&.,'()\/ -]*)(?:\s*\n|$)/im]) || firstBusinessName;
    loadNumber ||= getFirstMatch([/(?:Order|Load\s+Confirmation)\s*[:#\-]?\s*([A-Z0-9-]+)/i]);
    const carrier = getFirstMatch([/(?:^|\n)[ \t]*Carrier[ \t]*:[ \t]*([A-Za-z0-9&.,'()\/ -]+)/i]);
    const carrierMC = getFirstMatch([/(?:Carrier\s+)?MC\s*#?\s*[:#\-]?\s*([A-Z0-9-]+)/i]);
    const brokerMC = this.extractVerifiedBrokerMc(normalized);
    const commodity = getFirstMatch([/Commodity(?:\s*\/\s*Description)?\s*:\s*([A-Za-z0-9&.,'()\/ -]+)/i, /Pick\s*Up\s*#\s+Quantity\s+Unit\s+Commodity(?:\s+Notes)?\s*\n\s*\d+\s+\d+\s+\w+\s+([^\n]+)/i, /Commodities?:[\s\S]*?\n\s*\d+\s+\d+\s+\w+\s+([^\n]+)/i]);
    const equipmentMatch = normalized.match(/(?:^|\n)\s*(?:Equipment|Equipment\s*Type|Trailer\s*Type(?:\/Size)?)\s*[:\-]?\s*([A-Za-z0-9&.,'()\/\- ]+)/i);
    const equipment = equipmentMatch?.[1]?.replace(/\s*[|/]\s*.*$/, '').trim() || getFirstMatch([/(?:Equipment|Trailer\s*Type(?:\/Size)?)\s*[:\-]?\s*([A-Za-z0-9&.,'()\/\- ]+)/i]);
    const knownEquipmentPhrase = normalized.match(/straight\s+box\s+truck|box\s+truck|straight\s+truck|dry\s*van|53['’]?\s*van|temp(?:erature)?\s*controlled|refrigerated|reefer|flat\s*bed|\bFB\b|step\s*deck|power\s*only|hot\s*shot|hotshot|conestoga|rolling\s*tarp|lowboy(?:\s*RGN)?|low\s*boy|\bRGN\b|sprinter\s*van|tanker/i);
    const equipmentText = (knownEquipmentPhrase?.[0] || equipment || '').trim();
    let equipmentType = equipmentText ? normalizeEquipmentType(equipmentText).equipmentType : undefined;
    let equipmentTypeRaw = equipmentText || undefined;
    let rate = parseNumber(getFirstMatch([
      /Rate(?:\s*\(s\))?\s*[:\-]?\s*(?:USD\s*)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /TOTAL\s*[:\-]?\s*(?:USD\s*)?\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /\$([\d,]+(?:\.\d{1,2})?)\s+Line\s+Haul/i,
    ]));
    rate ??= parseNumber(getFirstMatch([/(?:Carrier\s+Freight\s+Pay|Total\s+Carrier\s+Pay)\s*[:\-]?\s*\$?([\d,]+(?:\.\d{1,2})?)/i]));
    const weight = parseNumber(getFirstMatch([
      /(?:Total\s*Weight|Weight)\s*(?:\(\s*(?:lbs?|kg)\s*\))?\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s*(?:lbs?|kg)?/i,
      /(?:Handling Units.*?Total Weight|Total Weight).*?([\d,]+(?:\.\d+)?)/i,
      /Estimated\s+Weight\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i,
    ]));
    const miles = parseNumber(getFirstMatch([/(?:Loaded\s*Miles|Total\s*Miles|Mileage|Miles)\s*(?:\(.*?\))?\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i]));

    const pickupBlock = normalized.match(/(?:Shipper Information:|Pick\s*-?\s*up\s*Location|Pickup:|Pick\s*-?\s*Ups?)\s*([\s\S]*?)(?=(?:\n\s*(?:Consignee Information:|Delivery:|Deliveries|Delivery\s*Location)|\n\s*(?:Pick\s*Up\s*Date\/Time:|Delivery\s*Date\/\s*Time:)|\n\s*(?:PICK\s*UP\s*INSTRUCTIONS:|DELIVERY\s*INSTRUCTIONS:)|\n\s*Handling Units|\n\s*Rate:|$))/i)?.[1] || '';
    const deliveryBlock = normalized.match(/(?:Consignee Information:|Delivery\s*Location|Delivery:|Deliveries)\s*([\s\S]*?)(?=(?:\n\s*(?:Handling Units|Rate:|Unloading|Note\s+to\s+Carrier|Pick\s+Up\s+#|Commodit(?:y|ies))|\n\s*(?:This confirmation|Carrier Signature|Please sign|Send Invoicing)|$))/i)?.[1] || '';

    const pickup = parseLocationBlock(pickupBlock, /Pick\s*Up\s*Date\/Time:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);
    const delivery = parseLocationBlock(deliveryBlock, /Delivery\s*Date\/\s*Time:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);

    const pickupDateTime = normalized.match(/Pick\s*Up\s*Date\/Time:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i)
      || normalized.match(/(?:Pick\s*Ups?|Shipper)\s*[\s\S]*?(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*\(?\s*(\d{1,2}:\d{2})\s*\)?/i);
    const deliveryDateTime = normalized.match(/Delivery\s*Date\/\s*Time:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i)
      || normalized.match(/(?:Deliveries|Receiver)\s*[\s\S]*?(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s*\(?\s*(\d{1,2}:\d{2})\s*\)?/i);
    const specialInstructions = [...normalized.matchAll(/(?:PICK\s*UP|DELIVERY)\s*INSTRUCTIONS?\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:PICK\s*UP|DELIVERY)\s*INSTRUCTIONS?\s*:|\n\s*Handling Units|\n\s*This confirmation|\n\s*Carrier Signature|\n\s*Please sign|\n\s*Send Invoicing|$))/gi)]
      .map((match) => stripLegalNoise(match[1]))
      .filter(Boolean)
      .join(' | ');

    pickup.date = pickupDateTime ? parseDate(pickupDateTime[1]) : pickup.date;
    if (pickupDateTime) Object.assign(pickup, parseTimeWindow(pickupDateTime[2]));
    delivery.date = deliveryDateTime ? parseDate(deliveryDateTime[1]) : delivery.date;
    if (deliveryDateTime) Object.assign(delivery, parseTimeWindow(deliveryDateTime[2]));

    const tqlPickup = normalized.match(/Pick[^A-Za-z]{0,3}up\s+Location[\s\S]{0,100}?([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\s*(?:((?:\d{5})(?:-\d{4})?))?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*Appt\s*([^\n]+)/i);
    const tqlDelivery = normalized.match(/Delivery\s+Location[\s\S]{0,100}?([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\s*(?:((?:\d{5})(?:-\d{4})?))?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*Appt\s*([^\n]+)/i);
    if (tqlPickup) {
      const city = tqlPickup[1].trim();
      const state = tqlPickup[2].trim();
      Object.assign(pickup, { facilityName: city, city, state, zip: tqlPickup[3], date: parseDate(tqlPickup[4]), ...parseTimeWindow(tqlPickup[5]) });
    }
    if (tqlDelivery) {
      const city = tqlDelivery[1].trim();
      const state = tqlDelivery[2].trim();
      Object.assign(delivery, { facilityName: city, city, state, zip: tqlDelivery[3], date: parseDate(tqlDelivery[4]), ...parseTimeWindow(tqlDelivery[5]) });
    }
    const tqlEquipment = normalized.match(/(?:Trailer\s*Type|Equipment)[^\n]*\n?([^\n]*?(?:Box\s*Truck|Dry\s*Van|Reefer|Flatbed)[^\n]*)/i)?.[1];
    if (!equipmentText && tqlEquipment) {
      equipmentTypeRaw = tqlEquipment.trim();
      equipmentType = normalizeEquipmentType(equipmentTypeRaw).equipmentType;
    }
    const tqlCommodity = normalized.match(/Pick\s*Up\s*#[\s\S]{0,160}?\b\d{1,3}\s*\d{1,3}\s*Units?\s*([^\n]+)/i)?.[1]
      || normalized.match(/\b\d+\s*Units?\s*([^\n]+)/i)?.[1];
    const tqlNote = normalized.match(/Note to\s*Carrier\s*([\s\S]*?)(?=\n\s*Pick Up #|\n\s*Commodities?:|$)/i)?.[1];

    const parseCompactStop = (label: string, type: 'pickup' | 'delivery') => {
      const match = normalized.match(new RegExp(`${label}[\\s\\S]{0,500}?Name\\s*:?\\s*([^\\n]+)[\\s\\S]{0,120}?Address\\s*:?\\s*([^\\n]+)[\\s\\S]{0,160}?([A-Za-z][A-Za-z .'-]+)\\s+([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)[\\s\\S]{0,180}?(\\d{1,2}\\/\\d{1,2}\\/\\d{4})\\s+(\\d{3,4})[\\s\\S]{0,40}?\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\s+(\\d{3,4})`, 'i'));
      if (!match) return undefined;
      const normalizeCompactTime = (value: string) => `${value.padStart(4, '0').slice(0, 2)}:${value.padStart(4, '0').slice(2)}`;
      const timeStart = normalizeCompactTime(match[7]);
      const timeEnd = normalizeCompactTime(match[8]);
      return {
        type,
        facilityName: compactWhitespace(match[1]),
        address: compactWhitespace(match[2]),
        city: compactWhitespace(match[3]),
        state: match[4].toUpperCase(),
        zip: match[5],
        date: parseDate(match[6]),
        time: `${timeStart} - ${timeEnd}`,
        timeStart,
        timeEnd,
      };
    };
    const compactPickup = parseCompactStop('PU\\s*1', 'pickup');
    const compactDelivery = parseCompactStop('SO\\s*2', 'delivery');
    if (compactPickup) Object.assign(pickup, compactPickup);
    if (compactDelivery) Object.assign(delivery, compactDelivery);
    const compactInstructions = normalized.match(/(?:^|\n)\s*Instructions\s*[:\-]?\s*\n?\s*([^\n]+)/i)?.[1];
    const normalizedStops = [compactPickup || { ...pickup, type: 'pickup' }, compactDelivery || { ...delivery, type: 'delivery' }]
      .filter((stop) => stop.city || stop.address);
    const confidence = {
      loadNumber: loadNumber ? 'high' : 'needs_review',
      broker: brokerName ? 'high' : 'needs_review',
      rate: rate !== undefined ? 'high' : 'needs_review',
      pickup: pickup.city ? 'high' : 'needs_review',
      delivery: delivery.city ? 'high' : 'needs_review',
    };

    return {
      loadNumber,
      brokerName,
      brokerMC,
      carrier,
      carrierMC,
      commodity: compactWhitespace(commodity || tqlCommodity),
      equipmentType,
      equipmentTypeRaw,
      rate,
      weight,
      miles,
      specialInstructions: specialInstructions || compactWhitespace(tqlNote) || compactWhitespace(compactInstructions) || undefined,
      pickup,
      delivery,
      stops: normalizedStops,
      confidence,
      reviewStatus: Object.values(confidence).includes('needs_review') ? 'needs_review' : 'ready',
    };
  }
}

export const aiService = new AIService();
