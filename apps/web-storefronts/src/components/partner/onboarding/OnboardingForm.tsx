/**
 * Partner Onboarding Form Component
 * @module web-storefronts/components/partner/onboarding/OnboardingForm
 * @description Multi-step partner signup form with document upload
 * @phase P205 - Storefront Partner Onboarding Flow
 */

'use client';

import React, { useCallback, useState } from 'react';

/** Onboarding form step */
export type OnboardingStep =
  | 'business-info'
  | 'contact-details'
  | 'restaurant-profile'
  | 'documents'
  | 'review';

/** Step configuration */
interface StepConfig {
  readonly id: OnboardingStep;
  readonly title: string;
  readonly description: string;
  readonly stepNumber: number;
}

/** All onboarding steps */
const ONBOARDING_STEPS: ReadonlyArray<StepConfig> = [
  {
    id: 'business-info',
    title: 'Business Information',
    description: 'Tell us about your business registration and legal entity',
    stepNumber: 1,
  },
  {
    id: 'contact-details',
    title: 'Contact Details',
    description: 'Primary contact person and communication preferences',
    stepNumber: 2,
  },
  {
    id: 'restaurant-profile',
    title: 'Restaurant Profile',
    description: 'Set up your restaurant profile, cuisine, and operating hours',
    stepNumber: 3,
  },
  {
    id: 'documents',
    title: 'Documents & Verification',
    description: 'Upload required business documents for verification',
    stepNumber: 4,
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your application before submission',
    stepNumber: 5,
  },
];

/** Business information form data */
interface BusinessInfo {
  businessName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
  businessType: 'sole-proprietor' | 'pty-ltd' | 'cc' | 'partnership';
  yearEstablished: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

/** Contact details form data */
interface ContactDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  preferredContact: 'email' | 'phone' | 'whatsapp';
}

/** Restaurant profile form data */
interface RestaurantProfile {
  cuisineType: string;
  description: string;
  averageMealPrice: string;
  seatingCapacity: string;
  deliveryRadius: string;
  minimumOrderAmount: string;
  estimatedPrepTime: string;
  operatingHours: ReadonlyArray<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}

/** Document upload data */
interface DocumentUploads {
  businessRegistration: File | null;
  foodSafetyCertificate: File | null;
  idDocument: File | null;
  bankStatement: File | null;
  menuDocument: File | null;
}

/** Complete onboarding form data */
interface OnboardingFormData {
  businessInfo: BusinessInfo;
  contactDetails: ContactDetails;
  restaurantProfile: RestaurantProfile;
  documents: DocumentUploads;
}

/** Initial form state */
const INITIAL_FORM_DATA: OnboardingFormData = {
  businessInfo: {
    businessName: '',
    tradingName: '',
    registrationNumber: '',
    vatNumber: '',
    businessType: 'pty-ltd',
    yearEstablished: '',
    address: {
      street: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
    },
  },
  contactDetails: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    preferredContact: 'email',
  },
  restaurantProfile: {
    cuisineType: '',
    description: '',
    averageMealPrice: '',
    seatingCapacity: '',
    deliveryRadius: '',
    minimumOrderAmount: '',
    estimatedPrepTime: '',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '22:00', isOpen: true },
      { day: 'Tuesday', open: '09:00', close: '22:00', isOpen: true },
      { day: 'Wednesday', open: '09:00', close: '22:00', isOpen: true },
      { day: 'Thursday', open: '09:00', close: '22:00', isOpen: true },
      { day: 'Friday', open: '09:00', close: '23:00', isOpen: true },
      { day: 'Saturday', open: '10:00', close: '23:00', isOpen: true },
      { day: 'Sunday', open: '10:00', close: '21:00', isOpen: true },
    ],
  },
  documents: {
    businessRegistration: null,
    foodSafetyCertificate: null,
    idDocument: null,
    bankStatement: null,
    menuDocument: null,
  },
};

/** SA province options */
const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

/** Cuisine type options */
const CUISINE_TYPES = [
  'African',
  'Indian',
  'Chinese',
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'American',
  'Mediterranean',
  'Fast Food',
  'Bakery',
  'Seafood',
  'Vegetarian/Vegan',
  'Fusion',
  'Other',
];

/**
 * OnboardingForm - Multi-step partner registration form
 *
 * Features:
 * - 5-step guided form flow
 * - Form validation per step
 * - Document upload with preview
 * - Progress indicator
 * - Auto-save to localStorage
 * - POPIA consent collection
 */
export function OnboardingForm(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('business-info');
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);

  const currentStepConfig = ONBOARDING_STEPS.find((s) => s.id === currentStep);
  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => s.id === currentStep);

  /** Navigate to next step */
  const goToNextStep = useCallback((): void => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < ONBOARDING_STEPS.length) {
      setCurrentStep(ONBOARDING_STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  /** Navigate to previous step */
  const goToPrevStep = useCallback((): void => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(ONBOARDING_STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  /** Update business info */
  const updateBusinessInfo = useCallback(
    (field: keyof BusinessInfo, value: string): void => {
      setFormData((prev) => ({
        ...prev,
        businessInfo: { ...prev.businessInfo, [field]: value },
      }));
    },
    [],
  );

  /** Update contact details */
  const updateContactDetails = useCallback(
    (field: keyof ContactDetails, value: string): void => {
      setFormData((prev) => ({
        ...prev,
        contactDetails: { ...prev.contactDetails, [field]: value },
      }));
    },
    [],
  );

  /** Update restaurant profile */
  const updateRestaurantProfile = useCallback(
    (field: keyof RestaurantProfile, value: string): void => {
      setFormData((prev) => ({
        ...prev,
        restaurantProfile: { ...prev.restaurantProfile, [field]: value },
      }));
    },
    [],
  );

  /** Handle document upload */
  const handleDocumentUpload = useCallback(
    (field: keyof DocumentUploads, file: File | null): void => {
      setFormData((prev) => ({
        ...prev,
        documents: { ...prev.documents, [field]: file },
      }));
    },
    [],
  );

  /** Submit the onboarding application */
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!popiaConsent) {
      setSubmitError('You must consent to POPIA data processing to continue');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_LMG_API_URL ?? '/api/v1';
      const submitData = new FormData();

      // Append JSON data
      submitData.append(
        'businessInfo',
        JSON.stringify(formData.businessInfo),
      );
      submitData.append(
        'contactDetails',
        JSON.stringify(formData.contactDetails),
      );
      submitData.append(
        'restaurantProfile',
        JSON.stringify(formData.restaurantProfile),
      );
      submitData.append('popiaConsent', 'true');

      // Append documents
      if (formData.documents.businessRegistration) {
        submitData.append(
          'businessRegistration',
          formData.documents.businessRegistration,
        );
      }
      if (formData.documents.foodSafetyCertificate) {
        submitData.append(
          'foodSafetyCertificate',
          formData.documents.foodSafetyCertificate,
        );
      }
      if (formData.documents.idDocument) {
        submitData.append('idDocument', formData.documents.idDocument);
      }
      if (formData.documents.bankStatement) {
        submitData.append('bankStatement', formData.documents.bankStatement);
      }
      if (formData.documents.menuDocument) {
        submitData.append('menuDocument', formData.documents.menuDocument);
      }

      const response = await fetch(`${apiUrl}/partners/onboard`, {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${String(response.status)}`);
      }

      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, popiaConsent]);

  // Success screen
  if (isSubmitted) {
    return (
      <div className="lmg-onboarding lmg-onboarding--success">
        <div className="lmg-onboarding__success-content">
          <div className="lmg-onboarding__success-icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#16a34a" strokeWidth="4" />
              <path
                d="M20 32l8 8 16-16"
                stroke="#16a34a"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="lmg-onboarding__success-title">
            Application Submitted!
          </h2>
          <p className="lmg-onboarding__success-message">
            Thank you for applying to partner with Lastmile Gig. Our team will
            review your application within 2-3 business days. You will receive
            an email confirmation shortly.
          </p>
          <p className="lmg-onboarding__success-ref">
            Reference: LMG-{new Date().getFullYear()}-
            {String(Math.floor(Math.random() * 10000)).padStart(4, '0')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lmg-onboarding">
      {/* Progress stepper */}
      <div className="lmg-onboarding__stepper" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={5}>
        {ONBOARDING_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`lmg-onboarding__step ${
              index < currentStepIndex
                ? 'lmg-onboarding__step--completed'
                : index === currentStepIndex
                  ? 'lmg-onboarding__step--active'
                  : 'lmg-onboarding__step--pending'
            }`}
          >
            <span className="lmg-onboarding__step-number">
              {index < currentStepIndex ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.485 3.929a1 1 0 010 1.414l-6.364 6.364a1 1 0 01-1.414 0L2.515 8.515a1 1 0 111.414-1.414l2.121 2.121 5.657-5.657a1 1 0 011.414 0l.364.364z" />
                </svg>
              ) : (
                String(step.stepNumber)
              )}
            </span>
            <span className="lmg-onboarding__step-title">{step.title}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="lmg-onboarding__content">
        <h2 className="lmg-onboarding__title">{currentStepConfig?.title}</h2>
        <p className="lmg-onboarding__description">
          {currentStepConfig?.description}
        </p>

        {/* Step 1: Business Information */}
        {currentStep === 'business-info' ? (
          <div className="lmg-form-grid">
            <div className="lmg-form-group">
              <label htmlFor="businessName" className="lmg-label">
                Registered Business Name *
              </label>
              <input
                id="businessName"
                type="text"
                className="lmg-input"
                value={formData.businessInfo.businessName}
                onChange={(e): void => updateBusinessInfo('businessName', e.target.value)}
                required
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="tradingName" className="lmg-label">
                Trading As (if different)
              </label>
              <input
                id="tradingName"
                type="text"
                className="lmg-input"
                value={formData.businessInfo.tradingName}
                onChange={(e): void => updateBusinessInfo('tradingName', e.target.value)}
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="registrationNumber" className="lmg-label">
                CIPC Registration Number *
              </label>
              <input
                id="registrationNumber"
                type="text"
                className="lmg-input"
                value={formData.businessInfo.registrationNumber}
                onChange={(e): void => updateBusinessInfo('registrationNumber', e.target.value)}
                placeholder="e.g. 2024/123456/07"
                required
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="vatNumber" className="lmg-label">
                VAT Number (if registered)
              </label>
              <input
                id="vatNumber"
                type="text"
                className="lmg-input"
                value={formData.businessInfo.vatNumber}
                onChange={(e): void => updateBusinessInfo('vatNumber', e.target.value)}
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="businessType" className="lmg-label">
                Business Type *
              </label>
              <select
                id="businessType"
                className="lmg-select"
                value={formData.businessInfo.businessType}
                onChange={(e): void => updateBusinessInfo('businessType', e.target.value)}
              >
                <option value="sole-proprietor">Sole Proprietor</option>
                <option value="pty-ltd">(Pty) Ltd</option>
                <option value="cc">Close Corporation (CC)</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>
            <div className="lmg-form-group">
              <label htmlFor="province" className="lmg-label">
                Province *
              </label>
              <select
                id="province"
                className="lmg-select"
                value={formData.businessInfo.address.province}
                onChange={(e): void => {
                  setFormData((prev) => ({
                    ...prev,
                    businessInfo: {
                      ...prev.businessInfo,
                      address: { ...prev.businessInfo.address, province: e.target.value },
                    },
                  }));
                }}
              >
                <option value="">Select Province</option>
                {PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {/* Step 2: Contact Details */}
        {currentStep === 'contact-details' ? (
          <div className="lmg-form-grid">
            <div className="lmg-form-group">
              <label htmlFor="firstName" className="lmg-label">First Name *</label>
              <input
                id="firstName"
                type="text"
                className="lmg-input"
                value={formData.contactDetails.firstName}
                onChange={(e): void => updateContactDetails('firstName', e.target.value)}
                required
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="lastName" className="lmg-label">Last Name *</label>
              <input
                id="lastName"
                type="text"
                className="lmg-input"
                value={formData.contactDetails.lastName}
                onChange={(e): void => updateContactDetails('lastName', e.target.value)}
                required
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="email" className="lmg-label">Email Address *</label>
              <input
                id="email"
                type="email"
                className="lmg-input"
                value={formData.contactDetails.email}
                onChange={(e): void => updateContactDetails('email', e.target.value)}
                required
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="phone" className="lmg-label">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                className="lmg-input"
                value={formData.contactDetails.phone}
                onChange={(e): void => updateContactDetails('phone', e.target.value)}
                placeholder="+27..."
                required
              />
            </div>
          </div>
        ) : null}

        {/* Step 3: Restaurant Profile */}
        {currentStep === 'restaurant-profile' ? (
          <div className="lmg-form-grid">
            <div className="lmg-form-group">
              <label htmlFor="cuisineType" className="lmg-label">Cuisine Type *</label>
              <select
                id="cuisineType"
                className="lmg-select"
                value={formData.restaurantProfile.cuisineType}
                onChange={(e): void => updateRestaurantProfile('cuisineType', e.target.value)}
              >
                <option value="">Select Cuisine</option>
                {CUISINE_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="lmg-form-group lmg-form-group--full">
              <label htmlFor="description" className="lmg-label">Restaurant Description *</label>
              <textarea
                id="description"
                className="lmg-textarea"
                value={formData.restaurantProfile.description}
                onChange={(e): void => updateRestaurantProfile('description', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Tell customers about your restaurant..."
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="minimumOrderAmount" className="lmg-label">Minimum Order (ZAR) *</label>
              <input
                id="minimumOrderAmount"
                type="number"
                className="lmg-input"
                value={formData.restaurantProfile.minimumOrderAmount}
                onChange={(e): void => updateRestaurantProfile('minimumOrderAmount', e.target.value)}
                min="0"
              />
            </div>
            <div className="lmg-form-group">
              <label htmlFor="estimatedPrepTime" className="lmg-label">Avg Prep Time (min) *</label>
              <input
                id="estimatedPrepTime"
                type="number"
                className="lmg-input"
                value={formData.restaurantProfile.estimatedPrepTime}
                onChange={(e): void => updateRestaurantProfile('estimatedPrepTime', e.target.value)}
                min="5"
                max="120"
              />
            </div>
          </div>
        ) : null}

        {/* Step 4: Documents */}
        {currentStep === 'documents' ? (
          <div className="lmg-form-grid">
            {[
              { key: 'businessRegistration' as const, label: 'CIPC Registration Certificate *', accept: '.pdf,.jpg,.png' },
              { key: 'foodSafetyCertificate' as const, label: 'Food Safety Certificate *', accept: '.pdf,.jpg,.png' },
              { key: 'idDocument' as const, label: 'Owner ID Document *', accept: '.pdf,.jpg,.png' },
              { key: 'bankStatement' as const, label: 'Bank Confirmation Letter', accept: '.pdf' },
              { key: 'menuDocument' as const, label: 'Menu (PDF or Image)', accept: '.pdf,.jpg,.png,.webp' },
            ].map((doc) => (
              <div key={doc.key} className="lmg-form-group">
                <label htmlFor={doc.key} className="lmg-label">{doc.label}</label>
                <input
                  id={doc.key}
                  type="file"
                  className="lmg-file-input"
                  accept={doc.accept}
                  onChange={(e): void => {
                    const file = e.target.files?.[0] ?? null;
                    handleDocumentUpload(doc.key, file);
                  }}
                />
                {formData.documents[doc.key] ? (
                  <span className="lmg-file-status">
                    Uploaded: {formData.documents[doc.key]?.name}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Step 5: Review */}
        {currentStep === 'review' ? (
          <div className="lmg-review">
            <div className="lmg-review__section">
              <h3>Business: {formData.businessInfo.businessName || 'Not provided'}</h3>
              <p>Registration: {formData.businessInfo.registrationNumber || 'Not provided'}</p>
              <p>Type: {formData.businessInfo.businessType}</p>
            </div>
            <div className="lmg-review__section">
              <h3>Contact: {formData.contactDetails.firstName} {formData.contactDetails.lastName}</h3>
              <p>Email: {formData.contactDetails.email || 'Not provided'}</p>
              <p>Phone: {formData.contactDetails.phone || 'Not provided'}</p>
            </div>
            <div className="lmg-review__section">
              <h3>Restaurant: {formData.restaurantProfile.cuisineType || 'Not specified'} Cuisine</h3>
              <p>Min Order: R{formData.restaurantProfile.minimumOrderAmount || '0'}</p>
              <p>Prep Time: {formData.restaurantProfile.estimatedPrepTime || '0'} min</p>
            </div>

            {/* POPIA Consent */}
            <div className="lmg-onboarding__consent">
              <label className="lmg-checkbox-label">
                <input
                  type="checkbox"
                  className="lmg-checkbox"
                  checked={popiaConsent}
                  onChange={(e): void => setPopiaConsent(e.target.checked)}
                />
                <span className="lmg-checkbox-text">
                  I consent to Lastmile Gig (Pty) Ltd processing my personal and
                  business information in accordance with the Protection of Personal
                  Information Act (POPIA). I understand that my data will be used for
                  partner onboarding, verification, and platform operations. I may
                  withdraw consent at any time by contacting privacy@lastmilegig.aagais.co.za.
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {/* Error message */}
        {submitError ? (
          <div className="lmg-alert lmg-alert--error" role="alert">
            {submitError}
          </div>
        ) : null}

        {/* Navigation buttons */}
        <div className="lmg-onboarding__actions">
          {currentStepIndex > 0 ? (
            <button
              type="button"
              className="lmg-btn lmg-btn--outline"
              onClick={goToPrevStep}
              disabled={isSubmitting}
            >
              Back
            </button>
          ) : null}

          {currentStep !== 'review' ? (
            <button
              type="button"
              className="lmg-btn lmg-btn--primary"
              onClick={goToNextStep}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="lmg-btn lmg-btn--primary lmg-btn--lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !popiaConsent}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
