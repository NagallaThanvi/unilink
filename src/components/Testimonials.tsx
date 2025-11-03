"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    role: "Software Engineer, Google",
    batch: "Class of 2020",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    content: "UniLink helped me reconnect with my KLH batch mates and find incredible mentorship opportunities. The blockchain verification gave me credibility when applying for jobs!",
    rating: 5,
  },
  {
    name: "Rajesh Kumar",
    role: "Data Scientist, Microsoft",
    batch: "Class of 2019",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh",
    content: "The encrypted messaging feature is a game-changer. I've been able to mentor current KLH students securely and privately. This platform truly bridges the alumni-student gap.",
    rating: 5,
  },
  {
    name: "Ananya Reddy",
    role: "Product Manager, Amazon",
    batch: "Class of 2021",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
    content: "I love the AI-powered newsletters! They keep me updated on KLH alumni achievements and events. It's so easy to stay connected with the community now.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              💬 Testimonials
            </span>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            What KLH Alumni Are Saying
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied KLH alumni who have transformed their networking experience
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  {/* Quote Icon */}
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                  
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-border">
                    <img
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full bg-muted"
                    />
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.batch}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}