import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { InsuranceDashboard } from './insurance-dashboard.js';
import { InsuranceApiService } from '../insurance-api.service.js';
import { InsuranceClaim, InsurancePayer, PatientPolicy } from '../insurance.model.js';
import { DirectoryResolverService } from '../../directory/directory-resolver.service.js';

describe('InsuranceDashboard', () => {
  const payer: InsurancePayer = {
    id: 'payer-1',
    name: 'Star Health',
    type: 'Private',
    contactPerson: 'Jane Doe',
    phone: '9999999999',
    address: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  const policy: PatientPolicy = {
    id: 'policy-1',
    patientId: 'patient-1',
    payerId: 'payer-1',
    policyNumber: 'POL-001',
    insuredName: 'John Doe',
    relationshipToInsured: 'Self',
    coverageStartDate: '2026-01-01',
    coverageEndDate: '2026-12-31',
    sumInsured: 500000,
    copayPercent: 10,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };

  const claim: InsuranceClaim = {
    id: 'claim-1',
    claimNumber: 'CLM-001',
    patientId: 'patient-1',
    policyId: 'policy-1',
    invoiceId: 'invoice-1',
    amountClaimed: 10000,
    amountApproved: null,
    status: 'Draft',
    remarks: null,
    submittedBy: 'acct-1',
    processedBy: null,
    submittedAt: null,
    processedAt: null,
    createdAt: '',
    updatedAt: '',
  };

  function setup(overrides: Partial<Record<keyof InsuranceApiService, jest.Mock>> = {}) {
    const insuranceApi = {
      listPayers: jest.fn().mockReturnValue(of([payer])),
      createPayer: jest.fn().mockReturnValue(of(payer)),
      updatePayer: jest.fn().mockReturnValue(of(payer)),
      deactivatePayer: jest.fn().mockReturnValue(of({ ...payer, isActive: false })),
      reactivatePayer: jest.fn().mockReturnValue(of({ ...payer, isActive: true })),
      listPolicies: jest.fn().mockReturnValue(
        of({ data: [policy], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      ),
      createPolicy: jest.fn().mockReturnValue(of(policy)),
      deactivatePolicy: jest.fn().mockReturnValue(of({ ...policy, isActive: false })),
      reactivatePolicy: jest.fn().mockReturnValue(of({ ...policy, isActive: true })),
      checkCoverage: jest.fn().mockReturnValue(
        of({
          eligible: true,
          policyId: 'policy-1',
          payerName: 'Star Health',
          coverageStartDate: '2026-01-01',
          coverageEndDate: '2026-12-31',
          copayPercent: 10,
          sumInsured: 500000,
        }),
      ),
      listClaims: jest.fn().mockReturnValue(
        of({ data: [claim], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }),
      ),
      createClaim: jest.fn().mockReturnValue(of(claim)),
      submitClaim: jest.fn().mockReturnValue(of({ ...claim, status: 'Submitted' })),
      approveClaim: jest.fn().mockReturnValue(of({ ...claim, status: 'Approved', amountApproved: 9000 })),
      rejectClaim: jest.fn().mockReturnValue(of({ ...claim, status: 'Rejected', remarks: 'no' })),
      markClaimPaid: jest.fn().mockReturnValue(of({ ...claim, status: 'Paid' })),
      ...overrides,
    } as unknown as InsuranceApiService;
    const auth = { hasPermission: jest.fn().mockReturnValue(true) } as unknown as AuthService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [InsuranceDashboard],
      providers: [
        { provide: InsuranceApiService, useValue: insuranceApi },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messageService },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(InsuranceDashboard);
    return { fixture, insuranceApi, auth, messageService };
  }

  it('loads payers, policies (page 1), and claims (page 1) on init', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(insuranceApi.listPayers).toHaveBeenCalledTimes(1);
    expect(insuranceApi.listPolicies).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
    expect(insuranceApi.listClaims).toHaveBeenCalledWith({ patientId: undefined, status: undefined, page: 1, limit: 20 });
    expect(fixture.componentInstance.payers()).toEqual([payer]);
    expect(fixture.componentInstance.policies()).toEqual([policy]);
    expect(fixture.componentInstance.claims()).toEqual([claim]);
  });

  it('gates the page content behind the insurance.read permission', async () => {
    const { fixture, auth } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(auth.hasPermission).toHaveBeenCalledWith('insurance.read');
  });

  it('builds a payerId -> name lookup from the loaded payers', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.payerNameById().get('payer-1')).toBe('Star Health');
  });

  it('creates a payer and reloads the list', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openPayerModal();
    fixture.componentInstance.payerForm.set({ name: 'New Payer', type: 'Government', contactPerson: '', phone: '', address: '' });
    fixture.componentInstance.submitPayer();
    await fixture.whenStable();

    expect(insuranceApi.createPayer).toHaveBeenCalledWith({
      name: 'New Payer',
      type: 'Government',
      contactPerson: undefined,
      phone: undefined,
      address: undefined,
    });
    expect(fixture.componentInstance.showPayerModal()).toBe(false);
  });

  it('refuses to submit a payer with no name', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.payerForm.set({ name: '  ', type: 'Private', contactPerson: '', phone: '', address: '' });
    fixture.componentInstance.submitPayer();

    expect(insuranceApi.createPayer).not.toHaveBeenCalled();
    expect(fixture.componentInstance.payerError()).toBeTruthy();
  });

  it('toggles a payer active/inactive', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.togglePayerActive(payer);
    await fixture.whenStable();

    expect(insuranceApi.deactivatePayer).toHaveBeenCalledWith('payer-1');
  });

  it('requests the correct policy page on lazy-load and applies the patient filter at page 1', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onPolicyLazyLoad({ first: 20 });
    expect((insuranceApi.listPolicies as jest.Mock).mock.calls[1][0]).toEqual({ patientId: undefined, page: 2, limit: 20 });

    fixture.componentInstance.policyPatientFilter.set('patient-9');
    fixture.componentInstance.applyPolicyFilter();
    expect(fixture.componentInstance.policyFirstRecord()).toBe(0);
    expect((insuranceApi.listPolicies as jest.Mock).mock.calls[2][0]).toEqual({ patientId: 'patient-9', page: 1, limit: 20 });
  });

  it('creates a policy and reloads the list', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.policyForm.set({
      patientId: 'patient-1',
      payerId: 'payer-1',
      policyNumber: 'POL-002',
      insuredName: '',
      relationshipToInsured: '',
      coverageStartDate: '2026-01-01',
      coverageEndDate: '2026-12-31',
      sumInsured: 100000,
      copayPercent: 5,
    });
    fixture.componentInstance.submitPolicy();
    await fixture.whenStable();

    expect(insuranceApi.createPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ policyNumber: 'POL-002', payerId: 'payer-1' }),
    );
    expect(fixture.componentInstance.showPolicyModal()).toBe(false);
  });

  it('runs a coverage check and stores the result', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.checkCoverage(policy);
    await fixture.whenStable();

    expect(insuranceApi.checkCoverage).toHaveBeenCalledWith('policy-1');
    expect(fixture.componentInstance.coverageResult()?.eligible).toBe(true);
    expect(fixture.componentInstance.showCoverageModal()).toBe(true);
  });

  it('applies the status filter to the claims list at page 1', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.claimStatusFilter.set('Submitted');
    fixture.componentInstance.applyClaimFilter();

    const call = (insuranceApi.listClaims as jest.Mock).mock.calls[1][0];
    expect(call).toEqual({ patientId: undefined, status: 'Submitted', page: 1, limit: 20 });
  });

  it('resets the policy patient filter via resetPolicyFilter()', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.policyPatientFilter.set('patient-123');
    fixture.componentInstance.applyPolicyFilter();
    expect(insuranceApi.listPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-123', page: 1 }),
    );

    fixture.componentInstance.resetPolicyFilter();
    expect(fixture.componentInstance.policyPatientFilter()).toBe('');
    expect(insuranceApi.listPolicies).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: undefined, page: 1 }),
    );
  });

  it('resets the claim filters via resetClaimFilter()', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.claimPatientFilter.set('patient-123');
    fixture.componentInstance.claimStatusFilter.set('Submitted');
    fixture.componentInstance.applyClaimFilter();
    expect(insuranceApi.listClaims).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-123', status: 'Submitted', page: 1 }),
    );

    fixture.componentInstance.resetClaimFilter();
    expect(fixture.componentInstance.claimPatientFilter()).toBe('');
    expect(fixture.componentInstance.claimStatusFilter()).toBe('');
    expect(insuranceApi.listClaims).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: undefined, status: undefined, page: 1 }),
    );
  });

  it('creates a claim and reloads the list', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.claimForm.set({
      patientId: 'patient-1',
      policyId: 'policy-1',
      invoiceId: 'invoice-1',
      amountClaimed: 5000,
      remarks: '',
    });
    fixture.componentInstance.submitClaim();
    await fixture.whenStable();

    expect(insuranceApi.createClaim).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', policyId: 'policy-1', invoiceId: 'invoice-1', amountClaimed: 5000 }),
    );
    expect(fixture.componentInstance.showClaimModal()).toBe(false);
  });

  it('refuses to submit a claim with a non-positive amount', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.claimForm.set({
      patientId: 'patient-1',
      policyId: 'policy-1',
      invoiceId: 'invoice-1',
      amountClaimed: 0,
      remarks: '',
    });
    fixture.componentInstance.submitClaim();

    expect(insuranceApi.createClaim).not.toHaveBeenCalled();
    expect(fixture.componentInstance.claimError()).toBeTruthy();
  });

  it('walks a claim through submit -> approve -> pay', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.submitClaimForSubmission(claim);
    await fixture.whenStable();
    expect(insuranceApi.submitClaim).toHaveBeenCalledWith('claim-1');

    fixture.componentInstance.openApproveModal(claim);
    expect(fixture.componentInstance.approveAmountDraft()).toBe(10000);
    fixture.componentInstance.approveAmountDraft.set(9000);
    fixture.componentInstance.confirmApprove();
    await fixture.whenStable();
    expect(insuranceApi.approveClaim).toHaveBeenCalledWith('claim-1', 9000);
    expect(fixture.componentInstance.showApproveModal()).toBe(false);

    fixture.componentInstance.markClaimPaid(claim);
    await fixture.whenStable();
    expect(insuranceApi.markClaimPaid).toHaveBeenCalledWith('claim-1');
  });

  it('refuses to approve a claim for more than was claimed', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openApproveModal(claim);
    fixture.componentInstance.approveAmountDraft.set(claim.amountClaimed + 1);
    expect(fixture.componentInstance.approveAmountInvalid).toBe(true);

    fixture.componentInstance.confirmApprove();
    expect(insuranceApi.approveClaim).not.toHaveBeenCalled();
  });

  it('refuses to approve a claim with a null or non-positive amount', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openApproveModal(claim);

    fixture.componentInstance.approveAmountDraft.set(null);
    expect(fixture.componentInstance.approveAmountInvalid).toBe(true);
    fixture.componentInstance.confirmApprove();
    expect(insuranceApi.approveClaim).not.toHaveBeenCalled();

    fixture.componentInstance.approveAmountDraft.set(0);
    expect(fixture.componentInstance.approveAmountInvalid).toBe(true);
    fixture.componentInstance.confirmApprove();
    expect(insuranceApi.approveClaim).not.toHaveBeenCalled();
  });

  it('rejects a claim only when remarks are provided', async () => {
    const { fixture, insuranceApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRejectModal(claim);
    fixture.componentInstance.confirmReject();
    expect(insuranceApi.rejectClaim).not.toHaveBeenCalled();

    fixture.componentInstance.rejectRemarksDraft.set('Not covered');
    fixture.componentInstance.confirmReject();
    await fixture.whenStable();
    expect(insuranceApi.rejectClaim).toHaveBeenCalledWith('claim-1', 'Not covered');
  });

  it('clears loading flags when list requests error', async () => {
    const { fixture } = setup({
      listPayers: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      listPolicies: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
      listClaims: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.payersLoading()).toBe(false);
    expect(fixture.componentInstance.policiesLoading()).toBe(false);
    expect(fixture.componentInstance.claimsLoading()).toBe(false);
  });
});
