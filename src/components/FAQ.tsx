"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Who can join UniLink?",
    answer: "UniLink is exclusively for KLH (KLE Technological University) students, alumni, and faculty members. You'll need to verify your KLH credentials during sign-up to gain access.",
  },
  {
    question: "Is UniLink really free?",
    answer: "Yes! UniLink is 100% free for all KLH community members. We believe in keeping alumni connected without any cost barriers. All features including blockchain verification, encrypted messaging, and AI newsletters are completely free.",
  },
  {
    question: "How does blockchain verification work?",
    answer: "Your academic credentials are verified and stored on the Polygon blockchain, creating an immutable record. This ensures your achievements are tamper-proof and can be easily verified by employers or other institutions.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely! We use end-to-end encryption for all messages, comply with GDPR regulations, and store sensitive data securely. Your privacy is our top priority. Blockchain records are public but don't contain personal information.",
  },
  {
    question: "How do I connect with other alumni?",
    answer: "Once verified, you can search for alumni by graduation year, major, location, or company. Send connection requests and start secure conversations through our encrypted messaging system.",
  },
  {
    question: "Can I update my credentials later?",
    answer: "Yes! You can update your profile information, work experience, and achievements anytime. Universities can verify and add new credentials to your blockchain record as you achieve more milestones.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-block mb-4">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              ❓ FAQ
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about UniLink
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}