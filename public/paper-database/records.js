export const folders = {
  index: {
    label: "Index",
    title: "Alexandru Oprea",
    caption: "Paper Database / Portfolio",
    description: "Salut! I’m a product designer exploring how people build trust in fintech and in the age of AI.",
    sketch: "index",
  },
  works: {
    label: "Works",
    description: "Selected product design work across investing, freelance finance, and transaction review.",
    sketch: "etf",
  },
  writing: {
    label: "Writing",
    description: "Notes on trust, restraint, and making uncertainty easier to understand.",
    sketch: "trust",
  },
  about: {
    label: "About",
    description: "A little about my path into product design and what I do away from my desk.",
    sketch: "profile",
  },
  contact: {
    label: "Contact",
    description: "Find me through the main portfolio.",
    sketch: "letter",
  },
};

export const records = [
  {
    id: "etf", folder: "works", title: "Financial ETF filter", topic: "Investing", tone: "sage",
    description: "Empowering investors through a smarter investment product screener.",
    href: "https://www.designwithalexandru.com/", link: "Visit my portfolio",
    metrics: [["24%", "Faster task completion"], ["18", "Usability sessions"], ["−2", "Steps to compare ETFs"]],
  },
  {
    id: "movo", folder: "works", title: "Movo", topic: "Freelance finance", tone: "blue",
    description: "A clearer way for freelancers to track income and set money aside for tax.",
    metrics: [["36", "User interviews"], ["4", "Prototype rounds"], ["82%", "Setup completion"]],
  },
  {
    id: "ledger", folder: "works", title: "Clear Ledger", topic: "Financial operations", tone: "sand",
    description: "A transaction review flow that helps small teams spot and resolve discrepancies.",
    metrics: [["12", "Prototype iterations"], ["30%", "Less review time"], ["8", "Test participants"]],
  },
  {
    id: "investment", folder: "works", title: "First Investment", topic: "Onboarding", tone: "sand",
    description: "An onboarding concept that explains risk before asking people to invest.",
    metrics: [["16", "Usability sessions"], ["88%", "Risk comprehension"], ["3", "Onboarding concepts"]],
  },
  {
    id: "trust", folder: "writing", title: "Designing for trust", topic: "Fintech", tone: "blue",
    description: "Why clear explanations matter more than reassurance in fintech.",
    href: "https://medium.com/search?q=Designing%20for%20trust", link: "Search on Medium",
  },
  {
    id: "quiet", folder: "writing", title: "The quiet interface", topic: "Interaction design", tone: "sage",
    description: "What happens when a product gives people room to think.",
    href: "https://medium.com/search?q=The%20quiet%20interface", link: "Search on Medium",
  },
  {
    id: "risk", folder: "writing", title: "Making risk readable", topic: "Risk communication", tone: "sand",
    description: "How to explain uncertainty without hiding the trade-offs.",
    href: "https://medium.com/search?q=Making%20risk%20readable", link: "Search on Medium",
  },
  {
    id: "profile", folder: "about", title: "Professional background", topic: "Product design", tone: "sage",
    description: "Product design, fintech, and an MSc in Product Management & UX Design.",
    href: "../sample-cv.html", link: "Read my CV",
  },
  {
    id: "hobbies", folder: "about", title: "Personal background", topic: "Painting & guitar", tone: "sand",
    description: "Away from my desk, I spend time painting and playing guitar. Both give me a different way to think about rhythm and composition.",
  },
  {
    id: "letter", folder: "contact", title: "Get in touch", topic: "Contact", tone: "blue",
    description: "Find me through the main portfolio.",
    href: "https://www.designwithalexandru.com/", link: "Visit my portfolio",
  },
];
