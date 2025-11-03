"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block mb-4">
              <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                🎓 Exclusively for KLH Community
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Connect, Verify, and Grow with{" "}
              <span className="text-primary">KLH Alumni Network</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              UniLink is the next-generation alumni networking platform exclusively for KLH (KLE Technological University). 
              Powered by blockchain verification, encrypted messaging, and AI-driven insights - completely free for all KLH members.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto group">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Blockchain Verified</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">E2E Encrypted Chat</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">AI-Powered</span>
              </div>
            </div>
          </motion.div>

          {/* Right Content - Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative">
              {/* Main Image */}
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img
                  src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop"
                  alt="KLH alumni networking"
                  className="w-full h-auto"
                />
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-card border border-border rounded-lg shadow-lg p-4 max-w-[200px]"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-8 w-8 bg-primary rounded-full" />
                  <div>
                    <p className="text-sm font-semibold">KLH Alumni</p>
                    <p className="text-xs text-muted-foreground">Class of 2023</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">✓ Credential Verified</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -top-6 -right-6 bg-card border border-border rounded-lg shadow-lg p-4 max-w-[180px]"
              >
                <p className="text-xs font-semibold mb-1">🔒 End-to-End Encrypted</p>
                <p className="text-xs text-muted-foreground">Your messages are secure</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}