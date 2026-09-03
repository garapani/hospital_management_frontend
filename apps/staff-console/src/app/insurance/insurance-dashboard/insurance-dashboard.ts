import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { InsuranceApiService } from '../insurance-api.service.js';
import {
  claimStatusSeverity,
  payerTypeSeverity,
  CoverageResult,
  CreateClaimDto,
  CreatePayerDto,
  CreatePolicyDto,
  InsuranceClaim,
  InsuranceClaimStatus,
  InsurancePayer,
  InsurancePayerType,
  PatientPolicy,
  UpdatePayerDto,
} from '../insurance.model.js';
import { EntityName } from '../../directory/entity-name.js';

const PAGE_SIZE = 20;

interface PayerFormState {
  name: string;
  type: InsurancePayerType;
  contactPerson: string;
  phone: string;
  address: string;
}

const EMPTY_PAYER_FORM: PayerFormState = { name: '', type: 'Private', contactPerson: '', phone: '', address: '' };

interface PolicyFormState {
  patientId: string;
  payerId: string;
  policyNumber: string;
  insuredName: string;
  relationshipToInsured: string;
  coverageStartDate: string;
  coverageEndDate: string;
  sumInsured: number;
  copayPercent: number;
}

const EMPTY_POLICY_FORM: PolicyFormState = {
  patientId: '',
  payerId: '',
  policyNumber: '',
  insuredName: '',
  relationshipToInsured: '',
  coverageStartDate: '',
  coverageEndDate: '',
  sumInsured: 0,
  copayPercent: 0,
};

interface ClaimFormState {
  patientId: string;
  policyId: string;
  invoiceId: string;
  amountClaimed: number;
  remarks: string;
}

const EMPTY_CLAIM_FORM: ClaimFormState = { patientId: '', policyId: '', invoiceId: '', amountClaimed: 0, remarks: '' };

@Component({
  selector: 'hms-insurance-dashboard',
  imports: [
    DatePipe,
    CurrencyPipe,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TabsModule,
    MessageModule,
    EntityName,
  ],
  templateUrl: './insurance-dashboard.html',
})
export class InsuranceDashboard {
  private readonly insuranceApi = inject(InsuranceApiService);
  private readonly messageService = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly activeTab = signal('payers');
  readonly claimStatusSeverity = claimStatusSeverity;
  readonly payerTypeSeverity = payerTypeSeverity;
  readonly payerTypeOptions = [
    { label: 'Government', value: 'Government' as InsurancePayerType },
    { label: 'Private', value: 'Private' as InsurancePayerType },
  ];
  readonly claimStatusOptions: { label: string; value: InsuranceClaimStatus }[] = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Submitted', value: 'Submitted' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  // ---------- Payers ----------
  readonly payers = signal<InsurancePayer[]>([]);
  readonly payersLoading = signal(false);
  readonly payerNameById = computed(() => new Map(this.payers().map((p) => [p.id, p.name])));

  readonly showPayerModal = signal(false);
  readonly payerForm = signal<PayerFormState>({ ...EMPTY_PAYER_FORM });
  readonly payerSaving = signal(false);
  readonly payerError = signal<string | null>(null);

  readonly showEditPayerModal = signal(false);
  readonly editPayerForm = signal<PayerFormState>({ ...EMPTY_PAYER_FORM });
  readonly editPayerId = signal<string | null>(null);
  readonly editPayerSaving = signal(false);
  readonly editPayerError = signal<string | null>(null);

  // ---------- Policies ----------
  readonly policies = signal<PatientPolicy[]>([]);
  readonly policiesLoading = signal(false);
  readonly policyTotalRecords = signal(0);
  readonly policyPageSize = signal(PAGE_SIZE);
  readonly policyFirstRecord = signal(0);
  readonly policyPatientFilter = signal('');

  readonly showPolicyModal = signal(false);
  readonly policyForm = signal<PolicyFormState>({ ...EMPTY_POLICY_FORM });
  readonly policySaving = signal(false);
  readonly policyError = signal<string | null>(null);
  readonly policyActionLoadingId = signal<string | null>(null);

  readonly showCoverageModal = signal(false);
  readonly coverageResult = signal<CoverageResult | null>(null);
  readonly coverageLoading = signal(false);

  // ---------- Claims ----------
  readonly claims = signal<InsuranceClaim[]>([]);
  readonly claimsLoading = signal(false);
  readonly claimTotalRecords = signal(0);
  readonly claimPageSize = signal(PAGE_SIZE);
  readonly claimFirstRecord = signal(0);
  readonly claimPatientFilter = signal('');
  readonly claimStatusFilter = signal<InsuranceClaimStatus | ''>('');

  readonly showClaimModal = signal(false);
  readonly claimForm = signal<ClaimFormState>({ ...EMPTY_CLAIM_FORM });
  readonly claimSaving = signal(false);
  readonly claimError = signal<string | null>(null);
  readonly claimActionLoadingId = signal<string | null>(null);

  readonly showApproveModal = signal(false);
  readonly approveClaimId = signal<string | null>(null);
  readonly approveAmountClaimed = signal(0);
  readonly approveAmountDraft = signal<number | null>(0);
  readonly approveSaving = signal(false);

  readonly showRejectModal = signal(false);
  readonly rejectClaimId = signal<string | null>(null);
  readonly rejectRemarksDraft = signal('');
  readonly rejectSaving = signal(false);

  constructor() {
    this.loadPayers();
    this.loadPolicies(0);
    this.loadClaims(0);
  }

  // ---------- Payers ----------
  loadPayers(): void {
    this.payersLoading.set(true);
    this.insuranceApi.listPayers().subscribe({
      next: (payers) => {
        this.payers.set(payers);
        this.payersLoading.set(false);
      },
      error: () => {
        this.payersLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load insurance payers.' });
      },
    });
  }

  openPayerModal(): void {
    this.payerForm.set({ ...EMPTY_PAYER_FORM });
    this.payerError.set(null);
    this.showPayerModal.set(true);
  }

  submitPayer(): void {
    const form = this.payerForm();
    if (!form.name.trim()) {
      this.payerError.set('Payer name is required.');
      return;
    }
    this.payerSaving.set(true);
    this.payerError.set(null);
    const dto: CreatePayerDto = {
      name: form.name.trim(),
      type: form.type,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };
    this.insuranceApi.createPayer(dto).subscribe({
      next: () => {
        this.payerSaving.set(false);
        this.showPayerModal.set(false);
        this.loadPayers();
        this.messageService.add({ severity: 'success', summary: 'Payer added', detail: `${dto.name} was added to the payer catalog.` });
      },
      error: (err: ApiError) => {
        this.payerSaving.set(false);
        this.payerError.set(err.message || 'Failed to save the payer.');
      },
    });
  }

  openEditPayerModal(payer: InsurancePayer): void {
    this.editPayerForm.set({
      name: payer.name,
      type: payer.type,
      contactPerson: payer.contactPerson ?? '',
      phone: payer.phone ?? '',
      address: payer.address ?? '',
    });
    this.editPayerId.set(payer.id);
    this.editPayerError.set(null);
    this.showEditPayerModal.set(true);
  }

  submitEditPayer(): void {
    const id = this.editPayerId();
    if (!id) return;
    this.editPayerSaving.set(true);
    this.editPayerError.set(null);
    const form = this.editPayerForm();
    const dto: UpdatePayerDto = {
      name: form.name,
      type: form.type,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };
    this.insuranceApi.updatePayer(id, dto).subscribe({
      next: () => {
        this.editPayerSaving.set(false);
        this.showEditPayerModal.set(false);
        this.loadPayers();
        this.messageService.add({ severity: 'success', summary: 'Payer updated', detail: `${form.name} saved.` });
      },
      error: (err: ApiError) => {
        this.editPayerSaving.set(false);
        this.editPayerError.set(err.message || 'Failed to update the payer.');
      },
    });
  }

  togglePayerActive(payer: InsurancePayer): void {
    const action = payer.isActive ? this.insuranceApi.deactivatePayer(payer.id) : this.insuranceApi.reactivatePayer(payer.id);
    action.subscribe({
      next: () => {
        this.loadPayers();
        this.messageService.add({
          severity: 'success',
          summary: payer.isActive ? 'Payer deactivated' : 'Payer reactivated',
          detail: `${payer.name} is ${payer.isActive ? 'no longer available for new policies' : 'available again'}.`,
        });
      },
      error: (err: ApiError) => {
        this.messageService.add({
          severity: 'error',
          summary: payer.isActive ? 'Deactivate failed' : 'Reactivate failed',
          detail: err.message || 'Please try again.',
        });
      },
    });
  }

  // ---------- Policies ----------
  loadPolicies(first: number): void {
    this.policiesLoading.set(true);
    const limit = this.policyPageSize();
    const page = Math.floor(first / limit) + 1;
    this.policyFirstRecord.set(first);
    this.insuranceApi.listPolicies({ patientId: this.policyPatientFilter() || undefined, page, limit }).subscribe({
      next: (result) => {
        this.policies.set(result.data);
        this.policyTotalRecords.set(result.meta.total);
        this.policiesLoading.set(false);
      },
      error: () => {
        this.policiesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load patient policies.' });
      },
    });
  }

  onPolicyLazyLoad(event: TableLazyLoadEvent): void {
    this.loadPolicies(event.first ?? 0);
  }

  applyPolicyFilter(): void {
    this.loadPolicies(0);
  }

  resetPolicyFilter(): void {
    this.policyPatientFilter.set('');
    this.applyPolicyFilter();
  }

  openPolicyModal(): void {
    this.policyForm.set({ ...EMPTY_POLICY_FORM });
    this.policyError.set(null);
    this.showPolicyModal.set(true);
  }

  submitPolicy(): void {
    const form = this.policyForm();
    if (!form.patientId.trim() || !form.payerId || !form.policyNumber.trim()) {
      this.policyError.set('Patient, payer, and policy number are required.');
      return;
    }
    this.policySaving.set(true);
    this.policyError.set(null);
    const dto: CreatePolicyDto = {
      patientId: form.patientId.trim(),
      payerId: form.payerId,
      policyNumber: form.policyNumber.trim(),
      insuredName: form.insuredName || undefined,
      relationshipToInsured: form.relationshipToInsured || undefined,
      coverageStartDate: form.coverageStartDate,
      coverageEndDate: form.coverageEndDate,
      sumInsured: form.sumInsured,
      copayPercent: form.copayPercent,
    };
    this.insuranceApi.createPolicy(dto).subscribe({
      next: () => {
        this.policySaving.set(false);
        this.showPolicyModal.set(false);
        this.loadPolicies(0);
        this.messageService.add({ severity: 'success', summary: 'Policy added', detail: `Policy ${dto.policyNumber} was created.` });
      },
      error: (err: ApiError) => {
        this.policySaving.set(false);
        this.policyError.set(err.message || 'Failed to save the policy.');
      },
    });
  }

  togglePolicyActive(policy: PatientPolicy): void {
    this.policyActionLoadingId.set(policy.id);
    const action = policy.isActive ? this.insuranceApi.deactivatePolicy(policy.id) : this.insuranceApi.reactivatePolicy(policy.id);
    action.subscribe({
      next: () => {
        this.policyActionLoadingId.set(null);
        this.loadPolicies(this.policyFirstRecord());
        this.messageService.add({
          severity: 'success',
          summary: policy.isActive ? 'Policy deactivated' : 'Policy reactivated',
          detail: `Policy ${policy.policyNumber} is ${policy.isActive ? 'now inactive' : 'active again'}.`,
        });
      },
      error: (err: ApiError) => {
        this.policyActionLoadingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: policy.isActive ? 'Deactivate failed' : 'Reactivate failed',
          detail: err.message || 'Please try again.',
        });
      },
    });
  }

  checkCoverage(policy: PatientPolicy): void {
    this.coverageLoading.set(true);
    this.coverageResult.set(null);
    this.showCoverageModal.set(true);
    this.insuranceApi.checkCoverage(policy.id).subscribe({
      next: (result) => {
        this.coverageResult.set(result);
        this.coverageLoading.set(false);
      },
      error: (err: ApiError) => {
        this.coverageLoading.set(false);
        this.showCoverageModal.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Coverage check failed',
          detail: err.message || 'Please try again.',
        });
      },
    });
  }

  // ---------- Claims ----------
  loadClaims(first: number): void {
    this.claimsLoading.set(true);
    const limit = this.claimPageSize();
    const page = Math.floor(first / limit) + 1;
    this.claimFirstRecord.set(first);
    this.insuranceApi
      .listClaims({
        patientId: this.claimPatientFilter() || undefined,
        status: this.claimStatusFilter() || undefined,
        page,
        limit,
      })
      .subscribe({
        next: (result) => {
          this.claims.set(result.data);
          this.claimTotalRecords.set(result.meta.total);
          this.claimsLoading.set(false);
        },
        error: () => {
          this.claimsLoading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load insurance claims.' });
        },
      });
  }

  onClaimLazyLoad(event: TableLazyLoadEvent): void {
    this.loadClaims(event.first ?? 0);
  }

  applyClaimFilter(): void {
    this.loadClaims(0);
  }

  resetClaimFilter(): void {
    this.claimPatientFilter.set('');
    this.claimStatusFilter.set('');
    this.applyClaimFilter();
  }

  openClaimModal(): void {
    this.claimForm.set({ ...EMPTY_CLAIM_FORM });
    this.claimError.set(null);
    this.showClaimModal.set(true);
  }

  submitClaim(): void {
    const form = this.claimForm();
    if (!form.patientId.trim() || !form.policyId.trim() || !form.invoiceId.trim()) {
      this.claimError.set('Patient, policy, and invoice are required.');
      return;
    }
    if (!Number.isFinite(form.amountClaimed) || form.amountClaimed <= 0) {
      this.claimError.set('Amount claimed must be a positive number.');
      return;
    }
    this.claimSaving.set(true);
    this.claimError.set(null);
    const dto: CreateClaimDto = {
      patientId: form.patientId.trim(),
      policyId: form.policyId.trim(),
      invoiceId: form.invoiceId.trim(),
      amountClaimed: form.amountClaimed,
      remarks: form.remarks || undefined,
    };
    this.insuranceApi.createClaim(dto).subscribe({
      next: (claim) => {
        this.claimSaving.set(false);
        this.showClaimModal.set(false);
        this.loadClaims(0);
        this.messageService.add({ severity: 'success', summary: 'Claim created', detail: `Claim ${claim.claimNumber} was created as Draft.` });
      },
      error: (err: ApiError) => {
        this.claimSaving.set(false);
        this.claimError.set(err.message || 'Failed to create the claim.');
      },
    });
  }

  submitClaimForSubmission(claim: InsuranceClaim): void {
    this.claimActionLoadingId.set(claim.id);
    this.insuranceApi.submitClaim(claim.id).subscribe({
      next: () => {
        this.claimActionLoadingId.set(null);
        this.loadClaims(this.claimFirstRecord());
        this.messageService.add({ severity: 'success', summary: 'Claim submitted', detail: `Claim ${claim.claimNumber} is now Submitted.` });
      },
      error: (err: ApiError) => {
        this.claimActionLoadingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Submit failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  openApproveModal(claim: InsuranceClaim): void {
    this.approveClaimId.set(claim.id);
    this.approveAmountClaimed.set(claim.amountClaimed);
    this.approveAmountDraft.set(claim.amountClaimed);
    this.showApproveModal.set(true);
  }

  get approveAmountInvalid(): boolean {
    const amount = this.approveAmountDraft();
    return amount === null || amount <= 0 || amount > this.approveAmountClaimed();
  }

  confirmApprove(): void {
    const id = this.approveClaimId();
    const amount = this.approveAmountDraft();
    if (!id || this.approveAmountInvalid || amount === null) return;
    this.approveSaving.set(true);
    this.insuranceApi.approveClaim(id, amount).subscribe({
      next: (claim) => {
        this.approveSaving.set(false);
        this.showApproveModal.set(false);
        this.loadClaims(this.claimFirstRecord());
        this.messageService.add({
          severity: 'success',
          summary: 'Claim approved',
          detail: `Claim ${claim.claimNumber} approved for ₹${(claim.amountApproved ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        });
      },
      error: (err: ApiError) => {
        this.approveSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Approve failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  openRejectModal(claim: InsuranceClaim): void {
    this.rejectClaimId.set(claim.id);
    this.rejectRemarksDraft.set('');
    this.showRejectModal.set(true);
  }

  confirmReject(): void {
    const id = this.rejectClaimId();
    if (!id || !this.rejectRemarksDraft().trim()) return;
    this.rejectSaving.set(true);
    this.insuranceApi.rejectClaim(id, this.rejectRemarksDraft().trim()).subscribe({
      next: (claim) => {
        this.rejectSaving.set(false);
        this.showRejectModal.set(false);
        this.loadClaims(this.claimFirstRecord());
        this.messageService.add({ severity: 'success', summary: 'Claim rejected', detail: `Claim ${claim.claimNumber} was rejected.` });
      },
      error: (err: ApiError) => {
        this.rejectSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Reject failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  markClaimPaid(claim: InsuranceClaim): void {
    this.claimActionLoadingId.set(claim.id);
    this.insuranceApi.markClaimPaid(claim.id).subscribe({
      next: () => {
        this.claimActionLoadingId.set(null);
        this.loadClaims(this.claimFirstRecord());
        this.messageService.add({ severity: 'success', summary: 'Claim marked paid', detail: `Claim ${claim.claimNumber} is now Paid.` });
      },
      error: (err: ApiError) => {
        this.claimActionLoadingId.set(null);
        this.messageService.add({ severity: 'error', summary: 'Mark paid failed', detail: err.message || 'Please try again.' });
      },
    });
  }
}
