import React from "react";
import Navbar from "./components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white text-neutral-900 font-sans">
      <Navbar />
      {/* Hero Section */}
      <section id="home" className="w-full flex flex-col items-center py-16 px-4 bg-white shadow-professional animate-fade-in">
        <img
          src="https://static.wixstatic.com/media/8a6dd3_0927349a2a864b1fb4b17aace3fc2b85~mv2.jpg/v1/fill/w_940,h_491,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/8a6dd3_0927349a2a864b1fb4b17aace3fc2b85~mv2.jpg"
          alt="DNA Paternity"
          className="rounded-xl w-full max-w-4xl object-cover mb-8 shadow-professional-lg animate-slide-up"
        />
        <h1 className="text-5xl font-bold mb-4 text-primary-900 text-center font-display leading-tight">LAB DNA SCIENTIFIC</h1>
        <h2 className="text-2xl font-medium mb-8 text-primary-700 text-center max-w-2xl leading-relaxed">Affordable Truths: Connecting families through DNA.</h2>
        <a
          href="#contact"
          className="inline-block bg-primary-600 text-white px-8 py-4 rounded-lg font-semibold shadow-professional-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          Book a Test
        </a>
      </section>

      {/* About Section */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Who we are</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Our DNA paternity testing service is designed for individuals and families in South Africa who are seeking accurate and reliable answers about biological relationships. We have more than 16 years experience in the Biological DNA science field.
            </p>
            <p className="mb-4">
              <strong>What we do:</strong> Our DNA paternity testing determines biological relationships with accuracy and reliability. Our scientific DNA technology is here to help mothers, fathers, children, and guardians gain clarity.
            </p>
            <p className="mb-4">
              <strong>Why we do it:</strong> We understand the importance of knowing the truth. Our testing service helps bring certainty to biological relationships, giving peace of mind and clarity to families.
            </p>
            <p>
              <strong>How we do it:</strong> Using expert scientific DNA technology, we analyse genetic markers to determine paternity accurately. We're committed to delivering trustworthy results that you can rely on.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How it Works Section */}
      <section id="how" className="max-w-6xl mx-auto py-16 px-4 bg-neutral-50">
        <h2 className="text-4xl font-bold mb-12 text-primary-900 text-center font-display">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Select a DNA test</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 text-sm">
                <li>Peace of mind Paternity DNA test from R1190 per person</li>
                <li>Legal use DNA paternity test from R1500 per person</li>
                <li>Home DNA paternity test kit from R1190 per person</li>
                <li>Peace of mind DNA sibling test</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Book or Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 text-sm">
                <li>Book appointment on our pricing and booking page.</li>
                <li>Home kit: receive email when ready for collection.</li>
                <li>Keep record of your unique reference number.</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Lab Process</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 text-sm">
                <li>DNA samples processed in 5-10 working days.</li>
                <li>From date of samples received at Lab.</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>4. Receive results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 text-sm">
                <li>Results sent via email in PDF format.</li>
                <li>Your unique reference number included on your report.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-5xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Affordable DNA tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">We're proud to be South Africa's most affordable DNA paternity test service. Our mission is to provide access to high-quality scientific services without compromising accuracy. You don't need to pay more for reliable results – choose us and save.</p>
            <ul className="list-disc pl-4 text-sm">
              <li>Peace of mind Paternity DNA test: <span className="font-semibold">R1190 per person</span></li>
              <li>Legal use DNA paternity test: <span className="font-semibold">R1500 per person</span></li>
              <li>Home DNA paternity test kit: <span className="font-semibold">R1190 per person</span></li>
              <li>Peace of mind DNA sibling test: <span className="font-semibold">Contact for pricing</span></li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-5xl mx-auto py-16 px-4 bg-neutral-50">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li>
                <strong>How long does it take to get results?</strong>
                <div>Results are typically available within 5-10 working days from when samples are received at the lab.</div>
              </li>
              <li>
                <strong>Is the test painful?</strong>
                <div>No, the test is non-invasive and only requires a cheek swab.</div>
              </li>
              <li>
                <strong>Can I use the results in court?</strong>
                <div>Yes, if you select the legal use DNA paternity test option.</div>
              </li>
              <li>
                <strong>How do I book a test?</strong>
                <div>Click the "Book a Test" button or contact us using the form below.</div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-5xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input placeholder="Name" required />
                <Input placeholder="Email" type="email" required />
              </div>
              <Input placeholder="Phone" required />
              <Input placeholder="Address" />
              <Input placeholder="Subject" />
              <textarea className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-base shadow-professional focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all duration-200 hover:border-neutral-400 min-h-[120px] resize-y" placeholder="Message" required />
              <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold shadow-professional hover:bg-primary-700 hover:shadow-professional-lg transition-all duration-300 transform hover:-translate-y-0.5">Submit</button>
            </form>
            <div className="mt-8 text-sm space-y-2">
              <div>Email: <a href="mailto:info@labdna.co.za" className="text-primary-700 hover:text-primary-900 transition-colors">info@labdna.co.za</a></div>
              <div>Phone: <a href="tel:0762042306" className="text-primary-700 hover:text-primary-900 transition-colors">0762042306</a></div>
              <div>WhatsApp: <a href="https://wa.me/message/HFZEPDD6GTGJN1" className="text-primary-700 hover:text-primary-900 transition-colors">Chat on WhatsApp</a></div>
              <div>Address: Ground Floor, Canal Edge Four, 3 Fountain Road, Bellville, Cape Town. 7530</div>
              <div>Opening Hours: Weekdays 9am - 5pm (Closed Weekends & Public Holidays)</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Thank You Section (hidden by default, show after form submit) */}
      <section id="thankyou" className="max-w-4xl mx-auto py-12 px-4 hidden">
        <Card>
          <CardHeader>
            <CardTitle>Thank You!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your message has been received. We will get back to you soon.</p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 bg-primary-900 text-white text-center mt-16">
        <div className="mb-4 text-lg">&copy; {new Date().getFullYear()} LAB DNA SCIENTIFIC. All rights reserved.</div>
        <div className="flex justify-center gap-4">
          <a href="https://rainbowofhope.co.za/" target="_blank" rel="noopener noreferrer">
            <img src="https://static.wixstatic.com/media/8a6dd3_123ea8c4ba234079bd8efa6d662aee9d~mv2.jpg/v1/fill/w_171,h_150,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Rainbow%20of%20Hope%20Logo.jpg" alt="Rainbow of Hope" className="h-10 inline" />
          </a>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-primary-200">
          <a href="#home" className="hover:text-white transition-colors duration-200">Home</a>
          <a href="#how" className="hover:text-white transition-colors duration-200">How it Works</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-200">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors duration-200">FAQ</a>
          <a href="#contact" className="hover:text-white transition-colors duration-200">Contact</a>
          <a href="#" className="hover:text-white transition-colors duration-200">Staff Login</a>
        </div>
      </footer>
    </div>
  );
}
