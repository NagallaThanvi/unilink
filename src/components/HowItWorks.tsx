"use client";

import { motion } from "framer-motion";
import { UserPlus, CheckCircle, MessageCircle, Sparkles } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up & Verify",
    description:
      "Create your account using Google or LinkedIn OAuth. Universities verify your credentials on the blockchain.",
    step: "01",
  },
  {
    icon: CheckCircle,
    title: "Build Your Profile",
    description:
      "Add your academic achievements, work experience, and interests. Connect with your alumni network.",
    step: "02",
  },
  {
    icon: MessageCircle,
    title: "Connect & Chat",
    description:
      "Find alumni in your field and start encrypted conversations. Share opportunities and mentorship.",
    step: "03",
  },
  {
    icon: Sparkles,
    title: "Stay Informed",
    description:
      "Receive AI-generated newsletters with relevant alumni news, events, and networking opportunities.",
    step: "04",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">How UniLink Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and join a verified alumni community
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-border -translate-x-1/2" />
              )}

              <div className="text-center relative z-10">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  <step.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}