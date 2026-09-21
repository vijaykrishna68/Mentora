> **Historical and superseded — this is NOT the implemented design.** This brief describes an early "fluid, restrained neo-brutalism" direction (strong borders, hard-edged contrast) that was not built. The shipped design is the **Modern Botanical / editorial** direction: warm ivory foundation, deep pine, one restrained terracotta accent, Ibarra Real Nova + Public Sans, soft warm-tinted shadows and no heavy borders. See [design/README.md](design/README.md), `design/mentora-editorial-direction.html` and `frontend/src/styles/tokens.css`. Interaction guidance below (timezone UX, booking flow, accessibility) may still be a useful reference, but the [README](README.md) and the code win on any difference.

# Mentora — Design Language Brief

## Context

We are building **Mentora**, a lightweight mentoring/coaching platform where customers discover mentors and book 1:1 mentoring sessions.

There are two roles:

* **Customer:** discovers mentors, views profiles, selects an offering, chooses an available slot, books, and manages appointments.
* **Mentor:** manages their profile, offerings, recurring availability, and appointments.

The product should feel like a **real, shippable SaaS product**, not a design exercise or generic appointment-booking template.

The MVP is intentionally small. The design should therefore focus heavily on quality, hierarchy, usability, and interaction details rather than visual complexity.

---

# Design Thesis

## Fluid, restrained neo-brutalism

The visual identity should take inspiration from neo-brutalist design while maintaining the usability, clarity, and trustworthiness of a modern SaaS product.

The neo-brutalist influence should come primarily from:

* Strong typography
* High contrast
* Confident visual hierarchy
* Intentional borders
* Controlled asymmetry
* Deliberate spacing
* Subtle depth
* Distinctive interactive states

It should **not** rely on exaggerated brutalist conventions.

Think:

> **Modern SaaS usability with a distinctive neo-brutalist/editorial personality.**

Neo-brutalism is an influence, not a constraint.

If a conventional UI pattern is more usable or accessible, prefer the conventional pattern.

---

# Desired Personality

The product should feel:

* Confident
* Human
* Energetic
* Trustworthy
* Clear
* Modern
* Slightly playful
* Premium without being luxurious or corporate

The overall emotional goal is:

> **Bold enough to be memorable. Calm enough to trust. Fluid enough to feel alive. Simple enough to book without thinking.**

---

# Explicitly Avoid

Do NOT create a stereotypical neo-brutalist website.

Avoid:

* Generic black-and-white brutalism
* Giant typography everywhere
* Excessive thick black borders
* Random stickers
* Random emojis as decoration
* Excessive use of loud colors
* More than one primary visual accent color
* Excessive pill-shaped UI
* Excessive rounded cards
* Excessive 0px sharp corners
* Every section looking like a poster
* Excessive asymmetry
* Chaotic layouts
* Decorative elements that compete with content
* Animations that exist only to demonstrate animation
* Overly playful or childish aesthetics
* A visual language that feels like a portfolio rather than a SaaS product

The product should never feel clunky or intimidating to a first-time user.

---

# Color Direction

Establish a restrained three-part foundation:

### 1. Base

Use a warm off-white / paper-like neutral as the primary background.

Avoid pure white as the dominant canvas unless necessary for contrast.

### 2. Primary Dark

Use a deep near-black or dark navy for primary typography, major UI elements, and strong contrast.

### 3. Accent

Use **one strong signature accent color**.

The accent should feel distinctive and energetic while still supporting trust and usability.

Explore a direction around electric/modern blue first, but evaluate whether another hue creates a stronger identity.

Do not introduce multiple competing brand colors.

Semantic colors such as success, warning, and error should remain separate from the brand accent and should be restrained.

The accent must have a clear purpose rather than being applied to every interactive element.

---

# Typography

Start with a **grotesk/sans-serif** typography direction.

Typography should feel:

* Modern
* Confident
* Highly readable
* Slightly editorial
* Appropriate for SaaS interfaces

Prefer one strong type family with a useful range of weights if possible.

Establish:

* Display / hero scale
* Page heading
* Section heading
* Body
* Supporting text
* Labels
* Captions
* Numeric/data styles

Do not use giant display typography everywhere.

Large typography should be reserved for moments where it improves hierarchy.

Typography should do much of the visual work instead of relying on decorative elements.

---

# Shape Language

Use restrained geometry.

Suggested direction:

* Moderate corner radii
* Stronger edges on important surfaces
* Avoid making everything circular or pill-shaped
* Avoid making everything completely sharp

The shape system should feel cohesive across:

* Cards
* Buttons
* Inputs
* Filters
* Calendar controls
* Availability slots
* Modals/sheets
* Badges

Neo-brutalist character should come from contrast, borders, spacing, and hierarchy rather than oversized geometry.

---

# Borders & Depth

Borders should be intentional.

Use them to:

* Define important surfaces
* Create hierarchy
* Separate content
* Emphasize interactive components

Avoid putting heavy borders around every element.

Depth should be subtle and purposeful.

Explore restrained hard/offset shadows where appropriate, but do not make every card look physically raised.

---

# Layout

Use a strong grid and clear information hierarchy.

Asymmetry is encouraged, but it must be **controlled**.

The layout should occasionally break the grid to create personality, but never at the expense of navigation or comprehension.

Important content should remain predictable.

The product is intended for first-time users, so:

> **Clarity always wins over visual experimentation.**

Use whitespace intentionally.

Avoid filling every available area with content.

---

# Photography

Mentor portraits are an important part of the product identity.

Photography should feel:

* Human
* Editorial
* Professional
* Approachable
* Authentic

Avoid generic corporate headshot aesthetics where possible.

Portraits can occasionally interact with the layout rather than always being tiny circular avatars.

However, photography should support the mentor's credibility and identity rather than becoming decoration.

For the final implementation, real/suitable mentor portraits will be sourced manually.

---

# Core Visual Component: Mentor Card

The mentor card is one of the most important components in the customer discovery experience.

It should communicate:

* Category
* Mentor name
* Portrait
* Experience
* Rating
* Sessions completed
* Price
* Session duration
* Earliest available slots

Example hierarchy:

```text
Career Guidance

[Portrait]  John Doe
            Senior Software Engineer · 8 yrs

            ★ 4.9 · 248 sessions

            ₹400 · 45 min

Next available
Tonight · 8:00 PM
Tomorrow · 10:00 AM

                         View slots →
```

The mentor's name, portrait, or card should lead naturally to their full profile.

Do not create two competing primary CTAs such as "View profile" and "Book".

The primary customer action should be discovering/selecting available slots.

---

# Availability UI

Availability should be one of the product's signature interactions.

Do not make the booking calendar feel like a generic scheduling widget.

Available slots should feel tactile and responsive.

Example:

```text
Thursday

┌────────────┐ ┌────────────┐ ┌────────────┐
│  8:00 PM   │ │  9:00 PM   │ │ 10:00 PM   │
│  45 min    │ │  45 min    │ │  45 min    │
└────────────┘ └────────────┘ └────────────┘
```

The selected state should have a clear visual transformation.

The interaction should communicate:

**Available → Selected → Confirmed**

without relying solely on color.

Disabled/unavailable slots should be immediately distinguishable.

---

# Timezone UX

Mentoring can happen across countries.

Appointments are stored canonically using UTC and converted for presentation.

Timezone information should **not clutter the discovery/home experience**.

Surface timezone information primarily when the customer is selecting a slot.

Example:

```text
Your time
8:30 PM · IST (UTC+5:30)

Mentor's time
10:00 AM · EDT
```

The user's timezone should be explicit enough that there is no ambiguity.

Country flags can be used as contextual identity information for mentors.

For example:

```text
🇺🇸 United States
```

Do not use flags as decorative elements throughout the interface.

Country and timezone are separate concepts.

---

# Booking Interaction

The booking experience should feel like a natural continuation of the mentor profile.

Expected flow:

```text
Mentor Profile
      ↓
Select Offering
      ↓
Select Date
      ↓
Select Slot
      ↓
Review Time + Timezone
      ↓
Confirm
      ↓
Success
```

Avoid unnecessary page transitions.

Use sheets, panels, or embedded flows where they improve continuity.

The confirmation state should feel satisfying but restrained.

Do not use excessive celebration animations.

---

# Mentor Profile

The mentor profile should feel human and credible.

It contains:

* Portrait
* Name
* Location
* Country flag
* Category
* Tags
* Experience
* About
* Experience timeline
* Rating
* Sessions completed
* Connection modes
* Offerings
* Testimonials/reviews
* FAQ

The visual hierarchy should make it easy to answer:

1. Who is this person?
2. Are they credible?
3. What can they help me with?
4. What does a session cost?
5. When can I meet them?
6. How will we connect?
7. Is this session appropriate for my needs?

---

# Mentor Dashboard

The mentor dashboard should feel like a focused professional workspace.

Primary areas:

### Appointments

Upcoming and past sessions.

### Offerings

Create and manage mentoring sessions.

### Availability

Manage recurring availability, session duration, and buffer.

### Profile

Edit mentor information.

### Availability Status

Provide a simple global toggle:

```text
● Accepting bookings
```

or

```text
○ Not accepting bookings
```

This should be visually clear without dominating the dashboard.

---

# Motion Principles

Motion should communicate **state and continuity**, not decoration.

Use subtle transitions for:

* Hover states
* Filtering
* Date navigation
* Slot selection
* Expanding/collapsing content
* Booking confirmation
* Page/section transitions

Motion should feel:

* Fluid
* Responsive
* Fast
* Physical
* Purposeful

Avoid:

* Constant floating elements
* Excessive bouncing
* Large entrance animations
* Long transitions
* Animation-heavy backgrounds
* CPU-intensive visual effects

The interface should remain performant, particularly on mobile devices.

---

# Accessibility

The visual identity must not compromise accessibility.

Ensure:

* Strong text contrast
* Focus states
* Keyboard navigation
* Clear disabled states
* Color is never the only indication of state
* Appropriate text sizing
* Touch-friendly controls
* Reduced-motion consideration

The neo-brutalist aesthetic should never become an excuse for poor accessibility.

---

# Responsive Behavior

Design mobile-first.

The product should work naturally across:

* Mobile
* Tablet
* Desktop

Do not simply shrink the desktop layout.

Important mobile considerations:

* Mentor cards
* Filters
* Profile hierarchy
* Availability selection
* Booking confirmation
* Appointments
* Mentor dashboard

Discovery and booking should remain comfortable on small screens.

---

# Design System Output

Based on this brief, establish a concrete design language and token system.

Please propose and define:

## Foundations

* Color tokens
* Typography tokens
* Font sizes
* Font weights
* Line heights
* Spacing scale
* Border widths
* Radius scale
* Shadow/depth tokens
* Motion/duration tokens
* Breakpoints

## Core Components

Define visual rules for:

* Buttons
* Inputs
* Selects
* Search
* Filters
* Cards
* Badges/tags
* Avatar/portrait
* Tabs
* Calendar
* Availability slots
* Status indicators
* Modal/sheet
* Toast/success feedback
* Empty states
* Error states
* Loading states

## Interaction States

Every interactive component should consider:

* Default
* Hover
* Focus
* Active
* Selected
* Disabled
* Loading
* Error
* Success

---

# Design Quality Test

Before finalizing the system, evaluate it against these questions:

1. Does this look clearly different from a generic appointment-booking template?
2. Does the neo-brutalist influence feel intentional but restrained?
3. Does it still look like a product that could realistically ship?
4. Can a first-time user understand the interface immediately?
5. Does the visual system make mentor profiles feel human?
6. Does the availability interaction feel distinctive?
7. Is the accent color being used with discipline?
8. Is asymmetry helping hierarchy rather than creating confusion?
9. Does the system remain accessible?
10. Does the design still work when the visual decoration is removed?

If any stylistic decision conflicts with usability, accessibility, or clarity, prioritize those over the aesthetic direction.

---

# Final Design North Star

> **Bold enough to be memorable. Calm enough to trust. Fluid enough to feel alive. Simple enough to book without thinking.**
