import { describe, expect, it } from 'vitest';
import { AIService, normalizeUSDate, splitContactPhone } from './ai.service';

describe('splitContactPhone', () => {
  it.each([
    ['Receiving (972) 555-0144', 'Receiving', '(972) 555-0144'],
    ['Shipping • 972-555-0144', 'Shipping', '(972) 555-0144'],
    ['Dispatch, 972.555.0144', 'Dispatch', '(972) 555-0144'],
    ['(972) 555-0144', undefined, '(972) 555-0144'],
  ])('splits contact and phone from %s', (raw, contact, phone) => {
    expect(splitContactPhone(raw)).toEqual({ contact, phone });
  });
});

describe('normalizeUSDate', () => {
  it.each([
    ['05/08/2026', '2026-05-08'],
    ['03/04/2026', '2026-03-04'],
    ['01/12/2026', '2026-01-12'],
    ['8/5/2026', '2026-08-05'],
  ])('normalizes US date %s without swapping month and day', (raw, expected) => {
    expect(normalizeUSDate(raw)).toBe(expected);
  });
});

describe('AIService.extractRateConfirmation', () => {
  it('does not treat a carrier MC#/DOT# as the broker MC#', async () => {
    const result = await new AIService().extractRateConfirmation(`
      TQL RATE CONFIRMATION FOR PO# 37813147
      TQL CONTACT INFO
      CARRIER CONTACT
      MC#/DOT# Name Phone Terms Fax
      1548399 / 4074075 Aggrey Express (ga) 205-243-8468 28DAYS
    `);

    expect(result.brokerMC).toBeUndefined();
  });

  it('leaves a blank broker MC signature field empty', async () => {
    const result = await new AIService().extractRateConfirmation(`
      Bill To: Example Logistics
      Broker MC#: ________________________
      Carrier Contact
      MC#/DOT# Name Phone
      1548399 / 4074075 Carrier Name 205-243-8468
    `);

    expect(result.brokerMC).toBeUndefined();
  });

  it('does not treat a signed carrier MC as the broker MC', async () => {
    const result = await new AIService().extractRateConfirmation(`
      Example Logistics Rate Confirmation
      Carrier: Carrier Name
      Carrier Signature: __________________
      MC#: 1548399
      Driver Name: __________________
    `);

    expect(result.brokerMC).toBeUndefined();
  });

  it('extracts an explicitly labeled broker MC- value', async () => {
    const result = await new AIService().extractRateConfirmation(`
      Bill To: Example Logistics
      Broker MC-123456
      Load #: LOAD-1
    `);

    expect(result.brokerMC).toBe('123456');
  });

  it('extracts Axle-style order, box truck, compact stops, carrier pay, and instructions', async () => {
    const service = new AIService();
    const result = await service.extractRateConfirmation(`
      AXLE LOGISTICS, LLC
      *** Load Confirmation *** 3506188
      Carrier: AGGREY EXPRESS
      Order: 3506188
      Miles: 811.0
      Commodity: Building Materials
      Weight: 2500.0
      Trailer: Straight Box Truck
      BOL: 49088-12812
      PU 1 Name: STARRCO
      Address: 1700 Fairgrove Industrial Blvd
      MARYLAND HEIGHTS MO 63043
      Date: 08/07/2026 0800
      08/07/2026 1400
      SO 2 Name: BREWER CONSTRUCTION
      Address: 589 STONEGATE DR.
      KATY TX 77494
      Date: 08/10/2026 0800
      08/10/2026 1400
      Carrier Freight Pay: $1,700.00
      Instructions
      26ft dock high
    `);

    expect(result.loadNumber).toBe('3506188');
    expect(result.brokerName).toBe('AXLE LOGISTICS, LLC');
    expect(result.carrier).toBe('AGGREY EXPRESS');
    expect(result.commodity).toBe('Building Materials');
    expect(result.weight).toBe(2500);
    expect(result.miles).toBe(811);
    expect(result.equipmentType).toBe('BOX_TRUCK');
    expect(result.rate).toBe(1700);
    expect(result.specialInstructions).toContain('26ft dock high');
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0]).toMatchObject({ type: 'pickup', facilityName: 'STARRCO', city: 'MARYLAND HEIGHTS', state: 'MO', zip: '63043', date: '2026-08-07', timeStart: '08:00', timeEnd: '14:00' });
    expect(result.stops[1]).toMatchObject({ type: 'delivery', facilityName: 'BREWER CONSTRUCTION', city: 'KATY', state: 'TX', zip: '77494', date: '2026-08-10', timeStart: '08:00', timeEnd: '14:00' });
  });

  it('splits pickup and delivery contact phone values into separate fields', async () => {
    const result = await new AIService().extractRateConfirmation(`
      Load #: CONTACT-1
      Bill To: Example Broker
      Rate: $1,000.00
      Pickup:
      Receiving (972) 555-0144
      100 Main Street
      Dallas, TX 75201
      Date: 05/08/2026
      Time: 09:00 AM
      Delivery:
      Shipping • 214-555-0199
      200 Oak Avenue
      Austin, TX 78701
      Date: 05/09/2026
      Time: 11:00 AM
    `);

    expect(result.pickup).toMatchObject({ contact: 'Receiving', phone: '(972) 555-0144' });
    expect(result.delivery).toMatchObject({ contact: 'Shipping', phone: '(214) 555-0199' });
  });

  it('normalizes the Axle ground truth into the new structured contract', async () => {
    const service = new AIService();
    const result = await service.extractRateConfirmationDocument({
      extractionMethod: 'text_layer',
      text: `AXLE LOGISTICS, LLC\n*** Load Confirmation *** 3506188\nCarrier: AGGREY EXPRESS\nOrder: 3506188\nMiles: 811.0\nCommodity: Building Materials\nPU 1 Name: STARRCO\nMARYLAND HEIGHTS MO 63043\n08/07/2026 0800\n08/07/2026 1400\nSO 2 Name: BREWER CONSTRUCTION\nKATY TX 77494\n08/10/2026 0800\n08/10/2026 1400\nCarrier Freight Pay: $1,700.00`,
    });

    expect(result.document_type).toBe('rate_confirmation');
    expect(result.load_id).toBe('3506188');
    expect(result.carrier_name).toBe('AGGREY EXPRESS');
    expect(result.total_rate).toBe(1700);
    expect(result.miles).toBe(811);
    expect(result.commodity).toBe('Building Materials');
    expect(result._meta.extraction_method).toBe('text_layer');
  });

  it('preserves complete pickup and delivery details with time windows', async () => {
    const service = new AIService();

    const text = `
      Load #: LD-1024
      Bill To: Horizon Freight Group
      MC # 482111
      Commodity: Steel Coil
      Equipment: Flatbed
      Rate: $2,750.00
      Weight: 42,000 lbs
      Miles: 255

      Pickup:
      1234 Main St
      Dallas, TX 75201
      Date: 06/15/2025
      Time: 09:00 AM - 12:00 PM

      Delivery:
      9876 River Road
      Phoenix, AZ 85001
      Date: 06/16/2025
      Time: 01:00 PM - 04:00 PM
    `;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('LD-1024');
    expect(result.brokerName).toBe('Horizon Freight Group');
    expect(result.brokerMC).toBe('482111');
    expect(result.commodity).toBe('Steel Coil');
    expect(result.rate).toBe(2750);
    expect(result.weight).toBe(42000);
    expect(result.miles).toBe(255);
    expect(result.equipmentType).toBe('FLATBED');

    expect(result.pickup?.address).toBe('1234 Main St');
    expect(result.pickup?.city).toBe('Dallas');
    expect(result.pickup?.state).toBe('TX');
    expect(result.pickup?.zip).toBe('75201');
    expect(result.pickup?.date).toBe('2025-06-15');
    expect(result.pickup?.time).toBe('09:00 AM - 12:00 PM');

    expect(result.delivery?.address).toBe('9876 River Road');
    expect(result.delivery?.city).toBe('Phoenix');
    expect(result.delivery?.state).toBe('AZ');
    expect(result.delivery?.zip).toBe('85001');
    expect(result.delivery?.date).toBe('2025-06-16');
    expect(result.delivery?.time).toBe('01:00 PM - 04:00 PM');
  });

  it('leaves optional fields empty when they are not present', async () => {
    const service = new AIService();

    const text = `
      Load #: LD-2048
      Bill To: ABC Logistics
      Commodity: Lumber
      Rate: $1,500.00
      Weight: 18,000 lbs
      Miles: 150

      Pickup:
      1000 Oak Avenue
      Austin, TX 78701

      Delivery:
      2200 Cedar Blvd
      Houston, TX 77002
    `;

    const result = await service.extractRateConfirmation(text);

    expect(result.pickup?.contact).toBeUndefined();
    expect(result.pickup?.phone).toBeUndefined();
    expect(result.delivery?.contact).toBeUndefined();
    expect(result.delivery?.phone).toBeUndefined();
    expect(result.specialInstructions).toBeUndefined();
    expect(result.pickup?.time).toBeUndefined();
    expect(result.delivery?.time).toBeUndefined();
  });

  it('extracts the real carrier rate confirmation without polluting special instructions with addresses or legal text', async () => {
    const service = new AIService();

    const text = `
TRUCKLOAD RATE CONFIRMATION
SolvLogix Inc
999 Oakmont Plaza Dr Suite 651
WESTMONT, IL 60559

580644
Carrier Name: AGGREY LLCLoad #: 130987096
Pickup Date: 8/15/2026Customer PO: Uhaul BOL # 78475983
Delivery Date Needed by or sooner: 8/17/2026Shipper Ref: 78475983
Service Level: Normal Trailer Type/Size: Van / Partial
Shipper Information:
Name:U-HAUL MOVING & STORAGE OF GRASS ISLANDContact:
Address:301 BOSTON POST RD Phone:

GUILFORD, CT 06437
Pick Up Date/Time:8/15/2026 9:00 AM-4:00 PM
Reference Number:794073
PICK UP
INSTRUCTIONS:
Uhaul BOL # 78475983 3 Ubox--96x60x93-- Driver must sign
name and MC # on all copies of BOL- Loading hrs 9am-4pm
Consignee Information:
Name:U-HAUL MOVING & STORAGE OF WAKE FORESTContact:
Address:9701 CAPITAL BLVD Phone:

WAKE FOREST, NC 27587
Delivery Date/ Time:
8/17/2026 9:00 AM -
4:00 PM
Reference Number:782028
DELIVERY
INSTRUCTIONS:
Uhaul BOL # 78475983 -First come first serve - Unloading hours:
9am to 4pm. Can deliver on or before (08/17/2026)
Handling UnitsPackage TypePiecesHAZMATList of ItemsTotal Weight
3U-Box3U-Box7,500




 Rate:USD $1,230.00
 TOTAL:USD $1,230.00

This confirmation governs the movement of the above-referenced freight as of the specified and hereby amends, is incorporated by reference and becomes a part of the certain transportation
contract by and between “Broker” and “Contract carrier”. Carrier Agrees to sign the confirmation and return it to the broker via FAX and carrier shall be conclusively presumed and
compensatory that the freight would not have been tendered to Carrier at higher rates and that not shipments handled under such rates will subsequently be subject to a later claim for
undercharges. IF AGREED SERVICES ARE FULFILLED, RATES ARE NOT NEGOTIABLE. Carrier is responsible for all pickup and delivery date times and appointments. Failure to comply with any pickup or
delivery date/time or appointments will result in a penalty of $250.00 Per Appointment. Late deliveries can have $250 late fee per day late past delivery date or appointment date. No
response to reasonable tracking rqeusts within 4 hrs of request will result in a @25.00 charge per request and failure to respond to the request.
The undersigned accepts the referenced shipment on behalf of the carrier and acknowledge as correct the information contained herein, the carrier agrees to the terms of the Master agreement
previously executed between our companies. Invoicing by the carrier and payment by SolvLogix Inc, constitutes acceptance of this agreement and creates a valid contract for carriage shipment.
When loading, the driver must count and inspect his/ her load. The Driver / Carrier is responsible for piece count and condition of load at time of delivery. For payment of freight charges,
we must receive original and signed Bill of landing and Proof of Delivery with a carrier invoice. Payment will be made 30 days after all required paperwork is received at SolvLogix Inc,
facilities. We are not responsible for Overweight. If Dimensions, Weight, Quantity or type of commodity are different than those consigned in our Load Confirmation Agreement, the carrier or
Broker contracted MUST notify SolvLogix Inc Before picking up and request a WRITTEN AUTHORIZATION. SolvLogix Inc will not pay any extra charges without AUTHORIZATION.
Phone: 630-912-8480 or 630-912-8186
Billing email: ap@solvlogix.com
Please sign and return via fax or email to

Carrier Signature:________________________Driver Name:________________________
MC#:________________________Driver Phone#:________________________

Please call (630) 912-3942 immediately with any questions, concerns, or problems!
Send Invoicing to: SolvLogix Inc | 999 Oakmont Plaza Dr Suite 651 | WESTMONT, IL 60559
    `;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('130987096');
    expect(result.brokerName).toBe('SolvLogix Inc');
    expect(result.pickup?.address).toBe('301 BOSTON POST RD');
    expect(result.pickup?.city).toBe('GUILFORD');
    expect(result.pickup?.state).toBe('CT');
    expect(result.pickup?.zip).toBe('06437');
    expect(result.pickup?.date).toBe('2026-08-15');
    expect(result.pickup?.time).toBe('9:00 AM-4:00 PM');

    expect(result.delivery?.address).toBe('9701 CAPITAL BLVD');
    expect(result.delivery?.city).toBe('WAKE FOREST');
    expect(result.delivery?.state).toBe('NC');
    expect(result.delivery?.zip).toBe('27587');
    expect(result.delivery?.date).toBe('2026-08-17');
    expect(result.delivery?.time).toBe('9:00 AM - 4:00 PM');

    expect(result.specialInstructions).toContain('Uhaul BOL # 78475983');
    expect(result.specialInstructions).not.toContain('301 BOSTON POST RD');
    expect(result.specialInstructions).not.toContain('GUILFORD, CT 06437');
    expect(result.specialInstructions).not.toContain('9701 CAPITAL BLVD');
    expect(result.specialInstructions).not.toContain('SolvLogix Inc');
    expect(result.specialInstructions).not.toContain('Rate:USD');
  });

  it('extracts the E2E rate confirmation layout without dropping the pickup and delivery blocks', async () => {
    const service = new AIService();
    const text = `
E2E TEST DATA - DO NOT USE IN PRODUCTION
Rate Confirmation
Load #: E2E-PLAYWRIGHT-20260828
Bill To: E2E TEST BROKER LLC
MC# E2E-MC-2026
Commodity:
ELECTRONIC EQUIPMENT
Case/Size: Full Truckload
Equipment: DRY VAN
Weight (lbs): 42000
Miles: 780
Rate: $2500.00 =
NOTES TO CARRIER:
E2E TEST DATA - DO NOT USE IN PRODUCTION
Pick Ups
E2E TEST SHIPPER
100 TEST WAY
DALLAS, TX 75201
08/28/2026 (08:00)
(555) 111-2222
Deliveries
E2E TEST RECEIVER
200 TEST ROAD
ATLANTA, GA 30301
09/01/2026 (14:00)
(555) 333-4444
`;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('E2E-PLAYWRIGHT-20260828');
    expect(result.brokerName).toBe('E2E TEST BROKER LLC');
    expect(result.brokerMC).toBe('E2E-MC-2026');
    expect(result.commodity).toBe('ELECTRONIC EQUIPMENT');
    expect(result.equipmentType).toBe('DRY_VAN');
    expect(result.weight).toBe(42000);
    expect(result.miles).toBe(780);
    expect(result.rate).toBe(2500);
    expect(result.pickup?.address).toBe('100 TEST WAY');
    expect(result.pickup?.city).toBe('DALLAS');
    expect(result.pickup?.state).toBe('TX');
    expect(result.pickup?.zip).toBe('75201');
    expect(result.pickup?.date).toBe('2026-08-28');
    expect(result.pickup?.time).toBe('08:00');
    expect(result.delivery?.address).toBe('200 TEST ROAD');
    expect(result.delivery?.city).toBe('ATLANTA');
    expect(result.delivery?.state).toBe('GA');
    expect(result.delivery?.zip).toBe('30301');
    expect(result.delivery?.date).toBe('2026-09-01');
    expect(result.delivery?.time).toBe('14:00');
  });

  it('extracts the real TQL layout without inventing unavailable fields', async () => {
    const service = new AIService();
    const text = `
TQL RATE CONFIRMATION FOR PO# 37813147
TQL CONTACT INFO
Name Phone Email Fax
Scott Burrows 800-580-3101 x43450 BurrowsDispatch@tql.com
CARRIER CONTACT
MC#/DOT# Name Phone Terms Fax
1548399 / 4074075 Aggrey Express (ga) 205-243-8468 28DAYS
LOAD INFORMATION
$1,100.00 Line Haul Flat 1.0000 $1,100.00
Mode Trailer Type Trailer Size
FTL Straight Box Truck 26 ft
Pick-up Location Date Time
Midway, GA 8/5/2026 Appt 11:00
Delivery Location Date Time
Lehigh Acres, FL 8/6/2026 Appt 11:00
Unloading None w/ valid unloading receipt Pallet Exchange None Estimated Weight 6294
Note to Carrier
Driver must accept tracking. Do not leave the load unattended.
Pick Up # Quantity Unit Commodity Notes
1 205 Units Automobile or light truck tires
`;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('37813147');
    expect(result.brokerName).toBe('TQL');
    expect(result.brokerMC).toBeUndefined();
    expect(result.commodity).toBe('Automobile or light truck tires');
    expect(result.weight).toBe(6294);
    expect(result.equipmentType).toBe('BOX_TRUCK');
    expect(result.rate).toBe(1100);
    expect(result.miles).toBeUndefined();
    expect(result.pickup).toMatchObject({ city: 'Midway', state: 'GA', date: '2026-08-05', timeStart: '11:00' });
    expect(result.delivery).toMatchObject({ city: 'Lehigh Acres', state: 'FL', date: '2026-08-06', timeStart: '11:00' });
    expect(result.pickup?.timeEnd).toBeUndefined();
    expect(result.delivery?.timeEnd).toBeUndefined();
    expect(result.pickup?.zip).toBeUndefined();
    expect(result.delivery?.zip).toBeUndefined();
    expect(result.pickup?.address).toBeUndefined();
    expect(result.delivery?.address).toBeUndefined();
    expect(result.pickup?.contact).toBeUndefined();
    expect(result.delivery?.contact).toBeUndefined();
    expect(result.specialInstructions).toContain('Driver must accept tracking');
  });

  it('extracts the supplied Logistic Dynamics layout', async () => {
    const service = new AIService();
    const text = `
Rate Confirmation
Bill To: Logistic Dynamics LLC
Load #: 2111033
Carrier: AGGREY EXPRESS
Rate(s): $1,700.00 = $1,700.00 x 1 (FLAT RATE)
Commodity:
ASSORTED LUMBER 26' BOX TRUCK
Weight (lbs): 5,000
Equipment: Hot Shot / 26'
Pick Ups
ULTRA ALUMINUM MANUFACTURING
2123 GRAND COMMERCE D
HOWELL, MI 48855
08/12/2026 (2pm APPT)
Deliveries
RIVERSIDE FENCE INC
137 ETHAN ALLEN HWY
RIDGEFIELD, CT 06877
08/13/2026 (0700-1500)
`;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('2111033');
    expect(result.brokerName).toBe('Logistic Dynamics LLC');
    expect(result.commodity).toContain("ASSORTED LUMBER 26' BOX TRUCK");
    expect(result.rate).toBe(1700);
    expect(result.weight).toBe(5000);
    expect(result.equipmentType).toBe('BOX_TRUCK');
    expect(result.pickup).toMatchObject({ city: 'HOWELL', state: 'MI', zip: '48855', date: '2026-08-12', timeStart: '14:00' });
    expect(result.delivery).toMatchObject({ city: 'RIDGEFIELD', state: 'CT', zip: '06877', date: '2026-08-13', timeStart: '07:00', timeEnd: '15:00' });
  });

  it('extracts the supplied SolvLogix layout without confusing carrier and broker', async () => {
    const service = new AIService();
    const text = `
TRUCKLOAD RATE CONFIRMATION
SolvLogix Inc
Carrier Name: AGGREY LLC Load #: 130987096
Trailer Type/Size: Van / Partial
Shipper Information:
Name: U-HAUL MOVING & STORAGE OF GRASS ISLAND
Address: 301 BOSTON POST RD
GUILFORD, CT 06437
Pick Up Date/Time: 8/15/2026 9:00 AM-4:00 PM
Consignee Information:
Name: U-HAUL MOVING & STORAGE OF WAKE FOREST
Address: 9701 CAPITAL BLVD
WAKE FOREST, NC 27587
Delivery Date/ Time: 8/17/2026 9:00 AM - 4:00 PM
Total Weight 7,500
Rate: USD $1,230.00
PICK UP INSTRUCTIONS:
Uhaul BOL # 78475983 Driver must sign name and MC # on all copies of BOL
`;

    const result = await service.extractRateConfirmation(text);

    expect(result.loadNumber).toBe('130987096');
    expect(result.brokerName).toBe('SolvLogix Inc');
    expect(result.rate).toBe(1230);
    expect(result.weight).toBe(7500);
    expect(result.equipmentType).toBe('DRY_VAN');
    expect(result.pickup).toMatchObject({ city: 'GUILFORD', state: 'CT', zip: '06437', date: '2026-08-15', timeStart: '09:00', timeEnd: '16:00' });
    expect(result.delivery).toMatchObject({ city: 'WAKE FOREST', state: 'NC', zip: '27587', date: '2026-08-17', timeStart: '09:00', timeEnd: '16:00' });
  });
});

describe('AIService CDL extraction', () => {
  it('extracts only explicitly labeled CDL values from text and normalizes US dates', () => {
    const service = new AIService() as any;
    const result = service.parseCdlText(`
      CDL Number: CDL12345
      State: AL
      Class: A
      Endorsements: H, N, T
      Restrictions: E
      Issue Date: 01/15/2024
      Expiration Date: 01/15/2028
      Date of Birth: 06/04/1985
    `);

    expect(result).toEqual({
      license_number: 'CDL12345',
      license_state: 'AL',
      cdl_class: 'A',
      cdl_endorsements: 'H, N, T',
      cdl_restrictions: 'E',
      cdl_issue_date: '2024-01-15',
      license_expiry: '2028-01-15',
      date_of_birth: '1985-06-04',
    });
  });

  it('omits missing or blank CDL values instead of returning replacements', () => {
    const service = new AIService() as any;
    expect(service.parseCdlText('CDL Number: __________\nClass:')).toEqual({});
  });
});
