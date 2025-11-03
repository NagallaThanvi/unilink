"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  MessageSquare,
  Sparkles,
  Users,
  FileCheck,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Blockchain Credential Verification",
    description:
      "Verify academic credentials and achievements on Polygon blockchain. Immutable, tamper-proof records ensure authenticity.",
  },
  {
    icon: MessageSquare,
    title: "Encrypted Messaging",
    description:
      "Connect with alumni through phone-based, end-to-end encrypted chat. Your conversations remain private and secure.",
  },
  {
    icon: Sparkles,
    title: "AI Newsletter Generation",
    description:
      "Stay updated with personalized newsletters powered by OpenAI. Get relevant content tailored to your interests.",
  },
  {
    icon: Users,
    title: "Alumni-Student Network",
    description:
      "Build meaningful connections between alumni, current students, and universities. Mentorship made easy.",
  },
  {
    icon: FileCheck,
    title: "Exam & Credential Management",
    description:
      "Securely store and share your academic achievements. Universities can verify credentials instantly.",
  },
  {
    icon: Globe,
    title: "Multi-Tenant Support",
    description:
      "Scalable platform supporting multiple universities and institutions with GDPR-compliant data management.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">
            Everything You Need for Alumni Networking
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform built with cutting-edge technology to connect,
            verify, and empower alumni communities worldwide.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}