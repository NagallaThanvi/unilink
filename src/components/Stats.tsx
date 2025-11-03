"use client";

import { motion } from "framer-motion";
import { Users, MessageSquare, Award, Calendar } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "5,000+",
    label: "Active Alumni",
    description: "Verified KLH members",
  },
  {
    icon: MessageSquare,
    value: "50,000+",
    label: "Secure Messages",
    description: "End-to-end encrypted",
  },
  {
    icon: Award,
    value: "2,500+",
    label: "Verified Credentials",
    description: "Blockchain-secured",
  },
  {
    icon: Calendar,
    value: "100+",
    label: "Alumni Events",
    description: "Hosted annually",
  },
];

export function Stats() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">
            Growing the KLH Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join a thriving network of verified alumni making meaningful connections
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-8 w-8 text-primary" />
              </div>
              <p className="text-4xl font-bold mb-2">{stat.value}</p>
              <p className="text-lg font-semibold mb-1">{stat.label}</p>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}