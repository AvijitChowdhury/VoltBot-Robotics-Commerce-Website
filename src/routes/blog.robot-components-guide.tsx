import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Cpu,
  Zap,
  Radar,
  Cog,
  Battery,
  Wrench,
  Radio,
  CircuitBoard,
} from "lucide-react";

const CANONICAL = "https://roboticsavijit.lovable.app/blog/robot-components-guide";
const TITLE = "What Are the Main Components of a Robot? A Beginner's Guide";
const DESCRIPTION =
  "New to robotics? Learn the 8 essential parts every robot needs — sensors, actuators, controllers, power, and more — with beginner-friendly examples and where to buy them in Bangladesh.";

export const Route = createFileRoute("/blog/robot-components-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "VoltBot" },
          publisher: {
            "@type": "Organization",
            name: "VoltBot",
            url: "https://roboticsavijit.lovable.app",
          },
          mainEntityOfPage: CANONICAL,
          inLanguage: "en",
          about: [
            "Robotics",
            "Robot components",
            "Sensors",
            "Actuators",
            "Microcontrollers",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What are the main components of a robot?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Most robots share eight core building blocks: a controller (brain), sensors, actuators, a power source, a mechanical structure (chassis), a drive system, communication modules, and end effectors or tools. Together they let a robot sense, decide, and act.",
              },
            },
            {
              "@type": "Question",
              name: "Which microcontroller is best for a beginner robot?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Arduino Uno is the friendliest starting point — huge community, cheap, and forgiving. Move to ESP32 when you need Wi-Fi or Bluetooth, and to Raspberry Pi when you need a full Linux computer for vision or AI.",
              },
            },
            {
              "@type": "Question",
              name: "Where can I buy robot parts in Bangladesh?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "VoltBot stocks sensors, motors, microcontrollers, drivers, batteries, and chassis kits with delivery across Bangladesh via Steadfast courier.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: RobotComponentsGuide,
});

type Part = {
  icon: typeof Cpu;
  title: string;
  short: string;
  body: string;
  examples: string;
};

const PARTS: Part[] = [
  {
    icon: Cpu,
    title: "1. Controller — the brain",
    short: "Runs the code that turns sensor input into motor output.",
    body:
      "The controller is a small computer that reads sensors, decides what to do, and tells the actuators to move. For hobby robots this is almost always a microcontroller board. Start simple: a single board can control a whole four-wheel rover.",
    examples: "Arduino Uno / Nano · ESP32 · Raspberry Pi Pico · Raspberry Pi 4",
  },
  {
    icon: Radar,
    title: "2. Sensors — the senses",
    short: "How the robot perceives distance, light, motion, and its environment.",
    body:
      "Sensors turn the physical world into numbers the controller can read. Pick sensors based on what the robot needs to know: distance to the wall in front (ultrasonic), whether it's on a black line (IR), which way is up (IMU), or what it's looking at (camera).",
    examples: "HC-SR04 ultrasonic · IR line sensor · MPU-6050 IMU · DHT22 · PIR motion",
  },
  {
    icon: Cog,
    title: "3. Actuators — the muscles",
    short: "Motors and servos that create motion.",
    body:
      "Actuators convert electrical energy into movement. DC motors spin wheels, servo motors hold precise angles for arms and steering, and stepper motors give repeatable positioning for CNC-style projects. Match torque and RPM to the job — a heavy rover needs geared motors, not tiny hobby ones.",
    examples: "TT gear motor · SG90 / MG996R servo · NEMA 17 stepper · N20 micro motor",
  },
  {
    icon: CircuitBoard,
    title: "4. Motor drivers — the amplifiers",
    short: "The chip that lets a 5V brain safely control 12V muscles.",
    body:
      "A microcontroller pin can only source a few milliamps — nowhere near enough to spin a motor. A motor driver is the middleman: the controller sends a low-power signal, the driver switches the high-power motor current. Never wire a motor directly to a GPIO pin; you will burn out the board.",
    examples: "L298N · L293D · TB6612FNG · A4988 (stepper) · DRV8825",
  },
  {
    icon: Battery,
    title: "5. Power source — the fuel",
    short: "Batteries and regulators that keep everything alive.",
    body:
      "Every robot needs clean, sufficient power. Logic (the controller) usually wants 5V, while motors often want 7–12V. Use a battery pack sized to the motors and a regulator or buck converter to feed the logic side. Undersized batteries are the number-one reason beginner robots reset mid-move.",
    examples: "18650 Li-ion pack · 7.4V LiPo · 12V SLA · LM2596 buck converter",
  },
  {
    icon: Wrench,
    title: "6. Chassis and mechanical structure — the body",
    short: "The frame that holds it all together.",
    body:
      "The chassis defines the robot's shape and how forces travel through it. Acrylic and aluminium kits are perfect for first builds; 3D-printed parts unlock custom shapes once you're comfortable. Keep the center of gravity low and mount heavy parts (battery, motors) close to the wheels.",
    examples: "2WD / 4WD acrylic chassis · aluminium extrusion · 3D-printed brackets",
  },
  {
    icon: Radio,
    title: "7. Communication modules — the voice",
    short: "How the robot talks to you, to phones, or to other robots.",
    body:
      "Add wireless when the robot needs to be controlled or monitored remotely. Bluetooth is easiest for phone-based joysticks; Wi-Fi (ESP32 or ESP8266) lets you build a web dashboard; long-range radios like nRF24 or LoRa are for outdoor projects far from any router.",
    examples: "HC-05 Bluetooth · ESP32 Wi-Fi · nRF24L01 · LoRa SX1278",
  },
  {
    icon: Zap,
    title: "8. End effectors and tools — the hands",
    short: "Grippers, pens, cameras — whatever does the actual job.",
    body:
      "The end effector is the reason the robot exists: a gripper for pick-and-place, a pen for a drawing robot, a nozzle for a 3D printer, a camera for a line-follower with vision. Pick this first, then design the rest of the robot around what it needs to carry and how precisely it must be positioned.",
    examples: "Servo gripper · suction cup · pen holder · ESP32-CAM · load cell",
  },
];

function RobotComponentsGuide() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-12 lg:px-8 lg:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/" className="hover:text-foreground">Home</Link>
            </li>
            <li aria-hidden>/</li>
            <li>Blog</li>
            <li aria-hidden>/</li>
            <li className="text-foreground">Robot components guide</li>
          </ol>
        </nav>

        <article>
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Beginner's guide
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              What are the main components of a robot?
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A friendly walkthrough of the 8 building blocks every robot has — with
              real parts you can buy in Bangladesh and start building this weekend.
            </p>
          </header>

          <section className="mb-10 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">The short answer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every robot — from a line-follower to an industrial arm — is made of the
              same 8 kinds of parts: a <strong>controller</strong>, <strong>sensors</strong>,{" "}
              <strong>actuators</strong>, <strong>motor drivers</strong>, a{" "}
              <strong>power source</strong>, a <strong>chassis</strong>,{" "}
              <strong>communication modules</strong>, and{" "}
              <strong>end effectors</strong>. Learn what each one does and you can
              understand (or design) any robot you'll ever meet.
            </p>
          </section>

          <div className="space-y-8">
            {PARTS.map((p) => {
              const Icon = p.icon;
              return (
                <section key={p.title} className="rounded-xl border border-border bg-surface p-6">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold">{p.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{p.short}</p>
                      <p className="mt-3 text-sm leading-relaxed">{p.body}</p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Popular parts:</span>{" "}
                        {p.examples}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <section className="mt-12 rounded-xl border border-border bg-surface p-6">
            <h2 className="text-2xl font-semibold">Your first robot: a simple recipe</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <strong>Controller:</strong> Arduino Uno — plenty of tutorials, works
                with almost every sensor.
              </li>
              <li>
                <strong>Sensors:</strong> two IR line sensors + one HC-SR04 ultrasonic
                for obstacle avoidance.
              </li>
              <li>
                <strong>Actuators:</strong> two TT gear motors with wheels.
              </li>
              <li>
                <strong>Driver:</strong> one L298N motor driver module.
              </li>
              <li>
                <strong>Power:</strong> 2× 18650 Li-ion cells in a holder (7.4V).
              </li>
              <li>
                <strong>Chassis:</strong> a 2WD acrylic robot car kit.
              </li>
              <li>
                <strong>Communication (optional):</strong> HC-05 Bluetooth to steer it
                from your phone.
              </li>
              <li>
                <strong>End effector:</strong> a servo-mounted pen so it draws as it
                drives.
              </li>
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">
              Total cost in Bangladesh: usually under ৳3,000 for a first build. Every
              part is a category you can grow into later.
            </p>
          </section>

          <section className="mt-10 rounded-xl border border-primary/40 bg-primary/5 p-6">
            <h2 className="text-xl font-semibold">Ready to start building?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              VoltBot ships robotics parts across Bangladesh with fast Steadfast
              courier delivery. Browse curated kits and individual components below.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Shop robotics parts
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
              >
                Back to homepage
              </Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="font-semibold">Which microcontroller is best for a beginner?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arduino Uno — the friendliest starting point with a huge tutorial
                  library. Graduate to ESP32 once you need Wi-Fi or Bluetooth, and to
                  Raspberry Pi when you need a full Linux computer for vision.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="font-semibold">Do I need to know how to code?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A little — Arduino uses simplified C++. You can copy working examples
                  on day one and understand them by week two. Block-based tools like
                  ArduBlock exist if you want a gentler start.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <h3 className="font-semibold">Where do I buy these parts in Bangladesh?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  VoltBot stocks sensors, motors, controllers, drivers, batteries, and
                  chassis kits with cash-on-delivery via Steadfast anywhere in the
                  country. Check the{" "}
                  <Link to="/products" className="text-primary hover:underline">
                    shop
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
