import React, { useState } from "react";
import { safeUrl } from "../lib/config.js";
export default function Contact({ section, global, visuals }) {
  const [status, setStatus] = useState("idle"),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.website) return;
    if (!global.contact.endpoint || !global.contact.accessKey) {
      setError(
        "Web sending is not configured. Please use the email link below.",
      );
      return;
    }
    setStatus("sending");
    setError("");
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch(global.contact.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: abort.signal,
        body: JSON.stringify({
          access_key: global.contact.accessKey,
          name: data.name,
          email: data.email,
          replyto: data.email,
          message: data.message,
          subject: global.contact.subject,
          botcheck: "",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Delivery failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("idle");
      setError(
        "Your message was not sent. Please try again or email me directly. Your text is still here.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  return (
    <section
      className="ending contact-section"
      id={section.id}
      data-section={section.id}
    >
      <img className="ending-art" src={safeUrl(visuals.ending, true)} alt="" />
      <div className="ending-content section-wrap">
        <div className="section-label">{section.eyebrow}</div>
        <div className="contact-grid">
          <div>
            <span className="hand-star">✳</span>
            <h2>{global.contact.heading}</h2>
            <p>{global.contact.text}</p>
            <a className="email-link" href={`mailto:${global.identity.email}`}>
              {global.identity.email} ↗
            </a>
          </div>
          <form onSubmit={submit}>
            <label>
              Your name
              <input
                name="name"
                placeholder="The name behind the idea"
                autoComplete="name"
                required
                maxLength={120}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="Where I can find you"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <label>
              What are you thinking?
              <textarea
                name="message"
                placeholder="Every good adventure starts somewhere…"
                rows={3}
                required
                maxLength={10000}
              />
            </label>
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" autoComplete="off" tabIndex={-1} />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={status === "sending"}
            >
              {status === "sending"
                ? "Sending…"
                : status === "sent"
                  ? "Send another message"
                  : "Send a little hello"}{" "}
              <span>↗</span>
            </button>
            <p className="form-status" role="status">
              {status === "sent"
                ? "Message delivered. Thanks for reaching out!"
                : error}
            </p>
          </form>
        </div>
        <footer>
          <span>
            © {new Date().getFullYear()} {global.identity.name}
          </span>
          <span>Made with curiosity. And a few happy accidents.</span>
          <a
            href="#/main/myself"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Back to the surface ↑
          </a>
        </footer>
      </div>
    </section>
  );
}
