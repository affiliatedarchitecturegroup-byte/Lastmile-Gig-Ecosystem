/**
 * Partner Onboarding Page
 * @module web-storefronts/app/partner/onboarding/page
 * @description Multi-step partner registration and onboarding
 * @phase P205 - Storefront Partner Onboarding Flow
 */

'use client';

import React from 'react';

import { OnboardingForm } from '../../../components/partner/onboarding/OnboardingForm';

/**
 * PartnerOnboardingPage - New partner registration and onboarding
 *
 * Features:
 * - 5-step guided application form
 * - Business information collection
 * - Document upload (CIPC, food safety, ID)
 * - Restaurant profile setup
 * - POPIA consent collection
 * - Application review and submission
 *
 * Route: /partner/onboarding
 * Authentication: Public (unauthenticated) - creates account on submission
 */
export default function PartnerOnboardingPage(): React.ReactElement {
  return (
    <div className="lmg-onboarding-page">
      {/* Page header */}
      <header className="lmg-onboarding-page__header">
        <div className="lmg-onboarding-page__brand">
          <h1 className="lmg-onboarding-page__logo">Lastmile Gig</h1>
          <span className="lmg-onboarding-page__tagline">Partner Programme</span>
        </div>
        <h2 className="lmg-onboarding-page__title">
          Join South Africa&apos;s Growing Delivery Platform
        </h2>
        <p className="lmg-onboarding-page__subtitle">
          Register your restaurant and start reaching thousands of new customers.
          Complete the application below and our team will review it within 2-3
          business days.
        </p>
      </header>

      {/* Benefits section */}
      <section className="lmg-onboarding-page__benefits" aria-label="Partner benefits">
        <div className="lmg-benefit-card">
          <span className="lmg-benefit-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm6 15h-5v5a1 1 0 01-2 0v-5h-5a1 1 0 010-2h5v-5a1 1 0 012 0v5h5a1 1 0 010 2z" />
            </svg>
          </span>
          <h3 className="lmg-benefit-card__title">Expand Your Reach</h3>
          <p className="lmg-benefit-card__text">
            Access thousands of customers across KwaZulu-Natal and beyond
          </p>
        </div>
        <div className="lmg-benefit-card">
          <span className="lmg-benefit-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M28 6H4a2 2 0 00-2 2v16a2 2 0 002 2h24a2 2 0 002-2V8a2 2 0 00-2-2zm-14 14H6v-2h8v2zm12-4H6v-2h20v2zm0-4H6v-2h20v2z" />
            </svg>
          </span>
          <h3 className="lmg-benefit-card__title">Easy Menu Management</h3>
          <p className="lmg-benefit-card__text">
            AI-powered menu upload and Sanity CMS for effortless updates
          </p>
        </div>
        <div className="lmg-benefit-card">
          <span className="lmg-benefit-card__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2a14 14 0 100 28 14 14 0 000-28zm1 19h-2v-2h2v2zm0-4h-2V9h2v8z" />
            </svg>
          </span>
          <h3 className="lmg-benefit-card__title">Real-Time Analytics</h3>
          <p className="lmg-benefit-card__text">
            Comprehensive dashboard with revenue tracking and customer insights
          </p>
        </div>
      </section>

      {/* Onboarding form */}
      <main className="lmg-onboarding-page__form-container">
        <OnboardingForm />
      </main>

      {/* Footer */}
      <footer className="lmg-onboarding-page__footer">
        <p>
          Need help? Contact our partner team at{' '}
          <a href="mailto:partners@lastmilegig.aagais.co.za">
            partners@lastmilegig.aagais.co.za
          </a>
        </p>
        <p className="lmg-onboarding-page__legal">
          &copy; {new Date().getFullYear()} Lastmile Gig (Pty) Ltd &mdash; A Subsidiary of
          Affiliated Architecture Group. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
