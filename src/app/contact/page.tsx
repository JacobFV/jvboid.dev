import { AskInput } from "@/components/chrome/AskInput";

export const metadata = {
  title: "Contact · Jacob Valdez",
  description: "Send Jacob a message, files and all, or call him.",
};

// Where old "reach out" links land. The bar is the home hero's ask bar,
// unchanged: typing or attaching turns its button into send, which opens
// the message sheet (emailed through the contact Worker, or handed to the
// visitor's own texting or mail app); an empty bar's button calls. So the
// phone and email still reach the browser only when a sheet opens.
export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pt-10 pb-16">
      <header className="mt-14 mb-12">
        <h1 data-page-title className="display-title">
          Contact
        </h1>
        <p className="standfirst mt-8">
          Write me a message — attach anything that helps — and I&apos;ll get it by email. Or leave
          it empty and press the phone to call.
        </p>
      </header>

      {/* The bar centres itself at max-w-xl; a box that width holds it
          flush left, under the title. */}
      <div className="max-w-xl">
        <AskInput />
      </div>
    </main>
  );
}
