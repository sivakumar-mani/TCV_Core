import { CableTvCustomerList } from './cable-tv-customer-list';
import { CustomerSelectFloatingFilter } from './customer-select-floating-filter';

describe('Cable customer list dropdown filters', () => {
  let list: CableTvCustomerList;

  beforeEach(() => {
    list = new CableTvCustomerList(null!, null!, null!, null!, null!, null!, { isAdmin: () => false } as any);
    list.allCustomers = [
      { cable_customer_id: 1, customer_code: 'TCV1', network_id: 1, customer_type: 'REGULAR', status: 'ACTIVE' },
      { cable_customer_id: 2, customer_code: 'TCV2', network_id: 1, customer_type: 'BUSINESS', status: 'ACTIVE' },
      { cable_customer_id: 3, customer_code: 'TCV3', network_id: 2, customer_type: 'LEASE_LINE', status: 'LEASE_LINE' },
      { cable_customer_id: 4, customer_code: 'TCV4', network_id: 2, customer_type: 'LEASE_LINE', status: 'Lease Line' },
      { cable_customer_id: 5, customer_code: 'TCV5', network_id: 1, customer_type: 'REGULAR', status: 'WAITING APPROVAL' }
    ];
  });

  it('combines CType and Status with existing network and customer number filters, then clears them', () => {
    const fields = list.colDefs.map(column => column.field);
    expect(fields.indexOf('stb_no')).toBe(fields.indexOf('full_name') + 1);
    expect(fields.indexOf('address_display')).toBe(fields.indexOf('stb_no') + 1);
    expect(fields.indexOf('customer_type')).toBe(fields.indexOf('status') - 1);
    Object.assign(list.filters, { customerType: 'BUSINESS', status: 'ACTIVE', networkId: '1', customerNo: 'TCV2' });
    list.applyFilters();
    expect(list.customers.map(row => row.cable_customer_id)).toEqual([2]);
    list.resetFilters();
    expect(list.customers.length).toBe(5);
    expect(list.filters.customerType).toBe('');
    list.selectedCustomerId = 1;
    list.resetFilters();
    expect(list.customers.map(row => row.cable_customer_id)).toEqual([1]);
  });

  it('matches lease line status representations and includes approval statuses without changing update rules', () => {
    list.filters.status = 'LEASE_LINE';
    list.applyFilters();
    expect(list.customers.map(row => row.cable_customer_id)).toEqual([3, 4]);
    expect(list.availableStatusOptions).toContain('WAITING APPROVAL');
    expect(list.canUpdateCustomer(list.allCustomers[4])).toBeFalse();
    expect(list.canUpdateCustomer(list.allCustomers[0])).toBeTrue();
  });

  it('applies dropdown selections as exact grid filters and synchronizes reset and newly loaded options', () => {
    const parent = { onFloatingFilterChanged: jasmine.createSpy('onFloatingFilterChanged') };
    const filter = new CustomerSelectFloatingFilter();
    let options = ['REGULAR', 'BUSINESS'];
    filter.init({
      column: { getColDef: () => ({ headerName: 'CType' }) },
      currentParentModel: () => null,
      parentFilterInstance: (callback: any) => callback(parent),
      options: () => options,
      formatLabel: (value: string) => list.titleCaseText(value)
    } as any);
    const select = filter.getGui();
    select.value = 'BUSINESS';
    select.dispatchEvent(new Event('change'));
    expect(parent.onFloatingFilterChanged).toHaveBeenCalledWith('equals', 'BUSINESS');
    filter.onParentModelChanged(null);
    expect(select.value).toBe('');
    select.dispatchEvent(new Event('change'));
    expect(parent.onFloatingFilterChanged).toHaveBeenCalledWith('equals', null);
    options = [...options, 'LEASE_LINE'];
    select.dispatchEvent(new Event('focus'));
    filter.onParentModelChanged({ filter: 'LEASE_LINE' });
    expect(select.value).toBe('LEASE_LINE');
    expect(select.selectedOptions[0].text).toBe('Lease Line');
  });
});
