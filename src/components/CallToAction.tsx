"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function CallToAction() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary text-primary-foreground">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl font-bold mb-4">
            Ready to Connect with the KLH Alumni Network?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the KLH community on the most secure and innovative networking platform - 
            completely free for all KLH students and alumni.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto group"
              >
                Join Free Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Learn More
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-primary-foreground/20">
            <div>
              <p className="text-3xl font-bold mb-1">100%</p>
              <p className="text-sm opacity-90">Free Forever</p>
            </div>
            <div>
              <p className="text-3xl font-bold mb-1">KLH</p>
              <p className="text-sm opacity-90">Exclusive Access</p>
            </div>
            <div>
              <p className="text-3xl font-bold mb-1">🔒</p>
              <p className="text-sm opacity-90">Secure & Verified</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}