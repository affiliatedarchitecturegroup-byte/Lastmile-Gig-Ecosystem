/**
 * StorefrontFooter Component (P186)
 *
 * Footer for the restaurant storefront pages.
 *
 * @module web-storefronts/components/storefront/storefront-footer
 */

import React from 'react';

export function StorefrontFooter(): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-white text-lg font-bold mb-3">Lastmile Gig</h3>
            <p className="text-sm">
              South Africa&apos;s last-mile delivery platform.
              Order from your favourite restaurants with fast, reliable delivery.
            </p>
          </div>

          {/* Customer links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">For Customers</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/store" className="hover:text-white transition-colors">Browse Restaurants</a></li>
              <li><a href="/rewards" className="hover:text-white transition-colors">Loyalty & Rewards</a></li>
              <li><a href="/help" className="hover:text-white transition-colors">Help Centre</a></li>
            </ul>
          </div>

          {/* Partner links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">For Partners</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/partner/signup" className="hover:text-white transition-colors">Become a Partner</a></li>
              <li><a href="/partner/dashboard" className="hover:text-white transition-colors">Partner Dashboard</a></li>
              <li><a href="/partner/support" className="hover:text-white transition-colors">Partner Support</a></li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>
            &copy; {currentYear} Lastmile Gig (Pty) Ltd. A subsidiary of Affiliated Architecture Group.
          </p>
        </div>
      </div>
    </footer>
  );
}
