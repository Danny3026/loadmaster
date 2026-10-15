import db from '../config/database';

export class InvoiceRepository {
  async findAll(companyId: string, filters: any = {}, pagination: any = { limit: 20, offset: 0 }) {
    try {
      let query = db('invoices')
        .select(
          'invoices.*',
          'loads.load_number as load_number',
          'loads.commodity as commodity',
          'loads.loaded_miles as miles',
          'brokers.name as broker_name',
          'companies.name as company_name',
          'drivers.first_name as driver_first_name',
          'drivers.last_name as driver_last_name',
          db.raw("NULLIF(CONCAT_WS(' - ', (SELECT CONCAT_WS(', ', city, state) FROM load_stops WHERE load_id = loads.id AND stop_type = 'PICKUP' ORDER BY stop_sequence LIMIT 1), (SELECT CONCAT_WS(', ', city, state) FROM load_stops WHERE load_id = loads.id AND stop_type = 'DELIVERY' ORDER BY stop_sequence LIMIT 1)), '') as route"),
          db.raw("(SELECT NULLIF(CONCAT_WS(', ', city, state), '') FROM load_stops WHERE load_id = loads.id AND stop_type = 'PICKUP' ORDER BY stop_sequence LIMIT 1) as pickup_location"),
          db.raw("(SELECT NULLIF(CONCAT_WS(', ', city, state), '') FROM load_stops WHERE load_id = loads.id AND stop_type = 'DELIVERY' ORDER BY stop_sequence LIMIT 1) as delivery_location")
        )
        .leftJoin('loads', function () {
          this.on('invoices.load_id', 'loads.id').andOn('invoices.company_id', 'loads.company_id');
        })
        .leftJoin('companies', 'invoices.company_id', 'companies.id')
        .leftJoin('brokers', function () {
          this.on('invoices.broker_id', 'brokers.id').andOn('invoices.company_id', 'brokers.company_id');
        })
        .leftJoin('load_assignments as active_assignment', function () {
          this.on('active_assignment.load_id', 'loads.id').andOnVal('active_assignment.is_active', true);
        })
        .leftJoin('drivers', function () {
          this.on('drivers.id', db.raw('COALESCE(active_assignment.driver_id, invoices.driver_id)'))
            .andOn('drivers.company_id', 'invoices.company_id');
        })
        .where('invoices.company_id', companyId);

      if (filters.status) query = query.where('invoices.status', filters.status);
      if (filters.payment_status) query = query.where('invoices.payment_status', filters.payment_status);
      if (filters.search) {
        query = query.where((builder) => {
          builder
            .whereRaw('invoices.invoice_number ILIKE ?', [`%${filters.search}%`])
            .orWhereRaw('loads.load_number ILIKE ?', [`%${filters.search}%`])
            .orWhereRaw('brokers.name ILIKE ?', [`%${filters.search}%`])
            .orWhereRaw("CONCAT_WS(' ', drivers.first_name, drivers.last_name) ILIKE ?", [`%${filters.search}%`])
            .orWhereRaw('invoices.status ILIKE ?', [`%${filters.search}%`]);
        });
      }

      const countResult = await query.clone().clearSelect().clearOrder().countDistinct('invoices.id as count').first();
      const count = countResult?.count;
      const total = typeof count === 'string' ? parseInt(count, 10) : (count || 0);

      const data = await query
        .orderBy('invoices.created_at', 'desc')
        .limit(pagination.limit)
        .offset(pagination.offset);

      return {
        data: data || [],
        total,
      };
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      // Return empty result if table doesn't exist or other errors
      return {
        data: [],
        total: 0,
      };
    }
  }

  async findById(companyId: string, id: string) {
    const invoice = await db('invoices')
      .select(
        'invoices.*',
          'loads.load_number as load_number',
          'loads.commodity as commodity',
          'loads.loaded_miles as miles',
          'loads.rate as load_rate',
          'brokers.name as broker_name',
          'brokers.mc_number as mc_number',
          'companies.name as company_name',
        'drivers.first_name as driver_first_name',
          'drivers.last_name as driver_last_name',
          db.raw("NULLIF(CONCAT_WS(' - ', (SELECT CONCAT_WS(', ', city, state) FROM load_stops WHERE load_id = loads.id AND stop_type = 'PICKUP' ORDER BY stop_sequence LIMIT 1), (SELECT CONCAT_WS(', ', city, state) FROM load_stops WHERE load_id = loads.id AND stop_type = 'DELIVERY' ORDER BY stop_sequence LIMIT 1)), '') as route"),
          db.raw("(SELECT NULLIF(CONCAT_WS(', ', city, state), '') FROM load_stops WHERE load_id = loads.id AND stop_type = 'PICKUP' ORDER BY stop_sequence LIMIT 1) as pickup_location"),
          db.raw("(SELECT NULLIF(CONCAT_WS(', ', city, state), '') FROM load_stops WHERE load_id = loads.id AND stop_type = 'DELIVERY' ORDER BY stop_sequence LIMIT 1) as delivery_location")
      )
        .leftJoin('loads', function () {
          this.on('invoices.load_id', 'loads.id').andOn('invoices.company_id', 'loads.company_id');
        })
      .leftJoin('companies', 'invoices.company_id', 'companies.id')
      .leftJoin('brokers', function () {
        this.on('invoices.broker_id', 'brokers.id').andOn('invoices.company_id', 'brokers.company_id');
      })
      .leftJoin('load_assignments as active_assignment', function () {
        this.on('active_assignment.load_id', 'loads.id').andOnVal('active_assignment.is_active', true);
      })
      .leftJoin('drivers', function () {
        this.on('drivers.id', db.raw('COALESCE(active_assignment.driver_id, invoices.driver_id)'))
          .andOn('drivers.company_id', 'invoices.company_id');
      })
      .where({ 'invoices.id': id, 'invoices.company_id': companyId })
      .first();

    return invoice || null;
  }

  async create(companyId: string, invoiceData: any) {
    const [invoice] = await db('invoices')
      .insert({
        ...invoiceData,
        accessorials: JSON.stringify(invoiceData.accessorials || []),
        company_id: companyId,
      })
      .returning('*');

    return this.findById(companyId, invoice.id);
  }

  async update(companyId: string, id: string, data: any) {
    const [invoice] = await db('invoices')
      .where({ id, company_id: companyId })
      .update({
        ...data,
        ...(data.accessorials !== undefined ? { accessorials: JSON.stringify(data.accessorials) } : {}),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (invoice) {
      return this.findById(companyId, id);
    }
    return null;
  }

  async delete(companyId: string, id: string) {
    return db('invoices')
      .where({ id, company_id: companyId })
      .delete();
  }

  async findByLoadId(companyId: string, loadId: string) {
    return db('invoices')
      .select(
        'invoices.*',
          'loads.load_number as load_number',
          'brokers.name as broker_name',
          'companies.name as company_name',
        'drivers.first_name as driver_first_name',
        'drivers.last_name as driver_last_name'
      )
      .leftJoin('loads', function () {
        this.on('invoices.load_id', 'loads.id').andOn('invoices.company_id', 'loads.company_id');
      })
      .leftJoin('companies', 'invoices.company_id', 'companies.id')
      .leftJoin('brokers', function () {
        this.on('invoices.broker_id', 'brokers.id').andOn('invoices.company_id', 'brokers.company_id');
      })
      .leftJoin('drivers', function () {
        this.on('invoices.driver_id', 'drivers.id').andOn('invoices.company_id', 'drivers.company_id');
      })
      .where({ 'invoices.load_id': loadId, 'invoices.company_id': companyId })
      .first();
  }

  async generateInvoiceNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db('invoices')
      .where('invoices.company_id', companyId)
      .count('* as count')
      .first();

    const countValue = typeof count?.count === 'string' ? parseInt(count.count, 10) : count?.count || 0;
    const sequenceNumber = (countValue + 1).toString().padStart(4, '0');
    return `INV-${year}-${sequenceNumber}`;
  }

  async getInvoiceStats(companyId: string) {
    try {
      const stats = await db('invoices')
        .select(
          db.raw('COUNT(*) as total_invoices'),
          db.raw('SUM(CASE WHEN payment_status = ? THEN total_amount ELSE 0 END) as unpaid_amount', ['UNPAID']),
          db.raw('SUM(CASE WHEN payment_status = ? THEN total_amount ELSE 0 END) as paid_amount', ['PAID']),
          db.raw('SUM(total_amount) as total_amount')
        )
        .where('company_id', companyId)
        .first();

      return stats || {
        total_invoices: 0,
        unpaid_amount: 0,
        paid_amount: 0,
        total_amount: 0,
      };
    } catch (error: any) {
      console.error('Error getting invoice stats:', error);
      return {
        total_invoices: 0,
        unpaid_amount: 0,
        paid_amount: 0,
        total_amount: 0,
      };
    }
  }
}

export const invoiceRepository = new InvoiceRepository();
