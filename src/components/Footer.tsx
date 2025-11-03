"use client";

import { GraduationCap, Mail, MapPin, Phone, Linkedin, Twitter, Facebook, Instagram } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">UniLink</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              The next-generation alumni networking platform exclusively for KLH. Connect, verify, and grow with blockchain-powered security.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/events" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/dashboard/alumni" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Alumni Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/BLOCKCHAIN.md" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Blockchain Guide
                </Link>
              </li>
              <li>
                <Link href="/SECURITY.md" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Security & Privacy
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>KLE Technological University, Hubballi, Karnataka, India</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:support@unilink.com" className="hover:text-foreground transition-colors">
                  support@unilink.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:+911234567890" className="hover:text-foreground transition-colors">
                  +91 123 456 7890
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} UniLink. All rights reserved. Built for KLH Community.
            </p>
            <div className="flex gap-4 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}