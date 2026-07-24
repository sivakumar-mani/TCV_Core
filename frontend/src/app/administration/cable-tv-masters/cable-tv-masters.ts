import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import { forkJoin } from 'rxjs';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { CableTvServices } from '../../services/cable-tv-services';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';

@Component({
  selector: 'app-cable-tv-masters',
  imports: [CommonModule, ReactiveFormsModule, TreeTableModule],
  templateUrl: './cable-tv-masters.html',
  styleUrl: './cable-tv-masters.scss'
})
export class CableTvMasters {
  masters: any = { networks: [], locations: [], areas: [], streets: [], locationInfos: [] };
  networkOptions: any[] = [];
  locationTree: TreeNode[] = [];
  filteredLocationTree: TreeNode[] = [];
  locationInfoForm!: FormGroup;
  selectedRow: any = null;
  mode: 'add' | 'edit' | 'view' = 'add';
  showModal = false;
  globalSearch = '';

  constructor(
    private fb: FormBuilder,
    private cableTvService: CableTvServices,
    private ngxLoader: NgxUiLoaderService,
    private snackbar: Snackbar
  ) {}

  ngOnInit() {
    this.locationInfoForm = this.fb.group({
      network_id: [null, Validators.required],
      location_id: [null, Validators.required],
      post_short_code: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      area_name: ['', Validators.required],
      street_name: ['', Validators.required]
    });
    this.loadMasters();
  }

  loadMasters() {
    this.ngxLoader.start();
    forkJoin({
      masters: this.cableTvService.getMasters(),
      lookups: this.cableTvService.getLookups()
    }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.masters = response.masters || this.masters;
        const networks = this.masters.networks?.length ? this.masters.networks : response.lookups?.networks || [];
        this.masters.networks = networks;
        this.networkOptions = this.staticNetworkOptions(networks);
        this.buildTree();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  selectPostalArea() {
    if (this.mode === 'view') return;
    const locationId = this.locationInfoForm.get('location_id')?.value;
    const postalArea = (this.masters.locations || []).find((item: any) => Number(item.location_id) === Number(locationId));
    if (!postalArea) return;
    this.locationInfoForm.patchValue({
      post_short_code: postalArea.post_short_code || '',
      pincode: postalArea.pincode || ''
    });
  }

  addNew() {
    this.mode = 'add';
    this.selectedRow = null;
    this.showModal = true;
    this.locationInfoForm.enable();
    this.locationInfoForm.reset();
  }

  viewRow(row: any) {
    this.patchRow(row);
    this.mode = 'view';
    this.showModal = true;
    this.locationInfoForm.disable();
  }

  editRow(row: any) {
    this.patchRow(row);
    this.mode = 'edit';
    this.showModal = true;
    this.locationInfoForm.enable();
  }

  closeModal() {
    this.showModal = false;
    this.addNewState();
  }

  deleteRow(row: any) {
    if (!confirm(`Delete ${row.location_name} / ${row.area_name} / ${row.street_name}?`)) return;
    this.ngxLoader.start();
    this.cableTvService.deleteLocationInfo(row.street_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'Location info deleted successfully', '');
        this.addNewState();
        this.loadMasters();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  saveLocationInfo() {
    if (this.mode === 'view') {
      this.closeModal();
      return;
    }
    if (this.locationInfoForm.invalid) {
      this.locationInfoForm.markAllAsTouched();
      return;
    }

    this.ngxLoader.start();
    const payload = this.locationInfoForm.getRawValue();
    const request = this.mode === 'edit' && this.selectedRow?.street_id
      ? this.cableTvService.updateLocationInfo(this.selectedRow.street_id, payload)
      : this.cableTvService.addLocationInfo(payload);

    request.subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.snackbar.openSnackbar(response?.message || 'Location info saved successfully', '');
        this.closeModal();
        this.loadMasters();
      },
      error: (error: any) => this.handleError(error)
    });
  }

  applyGlobalSearch(value: string) {
    this.globalSearch = value || '';
    this.filteredLocationTree = this.filterTree(this.locationTree, this.globalSearch.toLowerCase().trim());
  }

  private buildTree() {
    const networkMap = new Map<string, TreeNode>();
    const locationMap = new Map<string, any>();
    const areaMap = new Map<string, TreeNode>();
    const getNetworkNode = (network: any): TreeNode => {
      const networkKey = String(network.network_id);
      if (!networkMap.has(networkKey)) {
        networkMap.set(networkKey, {
          key: `network:${networkKey}`,
          expanded: true,
          data: {
            level: 'network',
            network_id: network.network_id,
            network_name: network.network_label,
            network_code: network.network_label
          },
          children: []
        });
      }
      return networkMap.get(networkKey)!;
    };

    (this.masters.locations || []).forEach((location: any) => {
      locationMap.set(String(location.location_id), location);
    });

    (this.masters.areas || []).forEach((area: any) => {
      const network = this.networkOptions.find((item: any) => Number(item.network_id) === Number(area.network_id));
      const location = locationMap.get(String(area.location_id)) || area;
      if (!network || !location?.location_id) return;

      const networkKey = String(network.network_id);
      const networkNode = getNetworkNode(network);
      const postalKey = `postal:${networkKey}:${location.location_id}`;
      let postalNode = (networkNode.children || []).find((node) => node.key === postalKey);
      if (!postalNode) {
        postalNode = {
          key: postalKey,
          expanded: true,
          data: {
            level: 'postal',
            network_id: network.network_id,
            network_name: network.network_label,
            network_code: network.network_label,
            location_id: location.location_id,
            location_name: location.location_name,
            post_short_code: location.post_short_code,
            pincode: location.pincode
          },
          children: []
        };
        networkNode.children = [...(networkNode.children || []), postalNode];
      }

      const areaKey = `area:${area.area_id}`;
      const areaNode: TreeNode = {
        key: areaKey,
        expanded: true,
        data: {
          level: 'area',
          network_id: area.network_id,
          network_name: area.network_name || networkNode.data?.network_name,
          network_code: area.network_code || networkNode.data?.network_code,
          location_id: location.location_id,
          location_name: location.location_name,
          post_short_code: location.post_short_code,
          pincode: location.pincode,
          area_id: area.area_id,
          area_name: area.area_name
        },
        children: []
      };
      postalNode.children = [...(postalNode.children || []), areaNode];
      areaMap.set(String(area.area_id), areaNode);
    });

    (this.masters.streets || []).forEach((street: any) => {
      const areaNode = areaMap.get(String(street.area_id));
      if (!areaNode) return;
      areaNode.children = [
        ...(areaNode.children || []),
        {
          key: `street:${street.street_id}`,
          data: {
            ...areaNode.data,
            ...street,
            level: 'street',
            street_name: street.street_name
          }
        }
      ];
    });

    this.locationTree = Array.from(networkMap.values());
    this.applyGlobalSearch(this.globalSearch);
  }

  private staticNetworkOptions(networks: any[]) {
    const allowed = ['TCV', 'SVN', 'PAMMAL', 'LO'];
    return allowed
      .map((code) => networks.find((network: any) =>
        String(network.network_code || network.network_name).toUpperCase() === code
      ))
      .map((network) => network ? {
        ...network,
        network_label: String(network.network_code || network.network_name).toUpperCase() === 'PAMMAL'
          ? 'Pammal'
          : String(network.network_code || network.network_name).toUpperCase()
      } : null)
      .filter(Boolean);
  }

  private filterTree(nodes: TreeNode[], search: string): TreeNode[] {
    if (!search) return nodes;

    return nodes.reduce<TreeNode[]>((result, node) => {
      const children = this.filterTree(node.children || [], search);
      const values = Object.values(node.data || {}).join(' ').toLowerCase();
      if (values.includes(search) || children.length) {
        result.push({ ...node, expanded: true, children });
      }
      return result;
    }, []);
  }

  private addNewState() {
    this.mode = 'add';
    this.selectedRow = null;
    this.locationInfoForm.enable();
    this.locationInfoForm.reset();
  }

  private patchRow(row: any) {
    this.selectedRow = row;
    this.locationInfoForm.patchValue({
      network_id: row.network_id,
      location_id: row.location_id,
      post_short_code: row.post_short_code,
      pincode: row.pincode,
      area_name: row.area_name,
      street_name: row.street_name
    });
  }

  private handleError(error: any) {
    this.ngxLoader.stop();
    let message = error?.error?.message || '';
    if (!message && typeof error?.error === 'string') {
      message = error.error.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (error?.status === 404 && message.includes('Cannot')) {
      message = 'Location info API is not available. Restart the backend server and try again.';
    }
    this.snackbar.openSnackbar(message || error?.message || globalConstants.genericError, globalConstants.errorRegex);
  }
}
