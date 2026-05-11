// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - POPIA Consent UI Component
// Phase: P067 | Reusable consent modal with plain-language copy
// -------------------------------------------------------------------

import React, { useState, useCallback } from 'react';

/** Consent type definitions with plain-language descriptions */
export interface ConsentItem {
  type: string;
  title: string;
  description: string;
  required: boolean;
  dataCategories: string[];
  retentionDays: number;
}

/** Default consent items per POPIA requirements */
export const DEFAULT_CONSENT_ITEMS: ConsentItem[] = [
  {
    type: 'personal_data_collection',
    title: 'Personal Information',
    description:
      'We collect your name, email, phone number, and address to create your account and process your orders. This information is stored securely and never shared without your permission.',
    required: true,
    dataCategories: ['name', 'email', 'phone', 'address'],
    retentionDays: 730,
  },
  {
    type: 'location_tracking',
    title: 'Location Services',
    description:
      'We use your location to show nearby restaurants, calculate delivery fees, and track your delivery in real time. Location data is only collected when you are using the app.',
    required: true,
    dataCategories: ['gps_coordinates', 'delivery_address'],
    retentionDays: 90,
  },
  {
    type: 'payment_processing',
    title: 'Payment Processing',
    description:
      'We process your payment through secure gateways (Paystack, Ozow). We do not store your full card details. Only a tokenised reference is kept for future payments.',
    required: true,
    dataCategories: ['payment_token', 'transaction_history'],
    retentionDays: 1825,
  },
  {
    type: 'marketing_communications',
    title: 'Marketing & Offers',
    description:
      'We would like to send you personalised offers, discounts, and updates about new restaurants in your area. You can unsubscribe at any time.',
    required: false,
    dataCategories: ['email', 'push_notification_token'],
    retentionDays: 365,
  },
  {
    type: 'analytics_processing',
    title: 'Usage Analytics',
    description:
      'We analyse how you use the app to improve our service, fix bugs, and develop new features. This data is anonymised and cannot be traced back to you personally.',
    required: false,
    dataCategories: ['app_usage', 'device_info'],
    retentionDays: 365,
  },
  {
    type: 'cookie_tracking',
    title: 'Cookies & Tracking',
    description:
      'We use cookies and similar technologies to remember your preferences, keep you logged in, and improve your browsing experience.',
    required: false,
    dataCategories: ['session_cookies', 'preference_cookies'],
    retentionDays: 365,
  },
];

/** Driver-specific consent items */
export const DRIVER_CONSENT_ITEMS: ConsentItem[] = [
  {
    type: 'biometric_processing',
    title: 'Biometric Verification',
    description:
      'We capture a facial scan to verify your identity at the start of each shift. Your biometric data is encrypted and stored in a secure vault, separate from other data. It is never shared with third parties.',
    required: true,
    dataCategories: ['facial_template', 'liveness_check'],
    retentionDays: 365,
  },
  {
    type: 'driver_background_check',
    title: 'Background & Licence Check',
    description:
      'We verify your driving licence and conduct a background check to ensure the safety of all platform users. This check is done once during onboarding.',
    required: true,
    dataCategories: ['driving_licence', 'criminal_record_check'],
    retentionDays: 1825,
  },
  {
    type: 'delivery_verification',
    title: 'Delivery Proof',
    description:
      'Photos taken at delivery are used as proof of delivery and stored on the blockchain for transparency. Your face is not captured in these photos.',
    required: true,
    dataCategories: ['delivery_photo', 'gps_coordinates', 'timestamp'],
    retentionDays: 1825,
  },
];

/** Props for the consent modal */
export interface ConsentModalProps {
  items: ConsentItem[];
  onSubmit: (consents: Record<string, boolean>) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
  title?: string;
  privacyPolicyUrl?: string;
}

/** Reusable POPIA consent modal component */
export const ConsentModal: React.FC<ConsentModalProps> = ({
  items,
  onSubmit,
  onClose,
  isOpen,
  title = 'Privacy & Data Consent',
  privacyPolicyUrl = '/privacy-policy',
}) => {
  const [consents, setConsents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      initial[item.type] = item.required;
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(
    (type: string, required: boolean) => {
      if (required) return;
      setConsents((prev) => ({ ...prev, [type]: !prev[type] }));
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(consents);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save consent preferences',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [consents, onSubmit]);

  const handleAcceptAll = useCallback(() => {
    const allAccepted: Record<string, boolean> = {};
    items.forEach((item) => {
      allAccepted[item.type] = true;
    });
    setConsents(allAccepted);
  }, [items]);

  const requiredConsentsGranted = items
    .filter((item) => item.required)
    .every((item) => consents[item.type]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
      className="lmg-consent-modal-overlay"
    >
      <div className="lmg-consent-modal">
        <div className="lmg-consent-modal-header">
          <h2 id="consent-modal-title">{title}</h2>
          <p className="lmg-consent-modal-subtitle">
            In compliance with the Protection of Personal Information Act
            (POPIA), we need your consent to process your data. Please review
            each item below.
          </p>
        </div>

        <div className="lmg-consent-modal-body">
          {items.map((item) => (
            <div
              key={item.type}
              className={`lmg-consent-item ${
                item.required ? 'lmg-consent-item--required' : ''
              }`}
            >
              <div className="lmg-consent-item-header">
                <label
                  htmlFor={`consent-${item.type}`}
                  className="lmg-consent-item-title"
                >
                  {item.title}
                  {item.required && (
                    <span className="lmg-consent-required-badge">
                      Required
                    </span>
                  )}
                </label>
                <input
                  id={`consent-${item.type}`}
                  type="checkbox"
                  checked={consents[item.type] || false}
                  onChange={() => handleToggle(item.type, item.required)}
                  disabled={item.required}
                  aria-describedby={`consent-desc-${item.type}`}
                  className="lmg-consent-checkbox"
                />
              </div>
              <p
                id={`consent-desc-${item.type}`}
                className="lmg-consent-item-description"
              >
                {item.description}
              </p>
              <div className="lmg-consent-item-meta">
                <span>
                  Data retained for:{' '}
                  {item.retentionDays >= 365
                    ? `${Math.round(item.retentionDays / 365)} year(s)`
                    : `${item.retentionDays} days`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="lmg-consent-error" role="alert">
            {error}
          </div>
        )}

        <div className="lmg-consent-modal-footer">
          <a
            href={privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lmg-consent-privacy-link"
          >
            Read our full Privacy Policy
          </a>
          <div className="lmg-consent-actions">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="lmg-consent-btn lmg-consent-btn--secondary"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!requiredConsentsGranted || isSubmitting}
              className="lmg-consent-btn lmg-consent-btn--primary"
            >
              {isSubmitting ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
