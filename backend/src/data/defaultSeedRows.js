/** Seed rows for relational collections (no Mongo _id — assigned on insert). */

module.exports.logs = [
  {
    date: '2026-04-05',
    tasks_completed: 'Typical floor slab pour (L9), curing started',
    workers_present: 86,
    issues: 'Concrete pump delay 45m — caught up by extended shift',
    photo_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop',
    author: 'Site Supervisor — R. Kulkarni',
    status: 'approved',
  },
  {
    date: '2026-04-04',
    tasks_completed: 'Shuttering strike L8, vertical steel inspection passed',
    workers_present: 79,
    issues: 'None critical',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop',
    author: 'Site Supervisor — R. Kulkarni',
    status: 'approved',
  },
  {
    date: '2026-04-03',
    tasks_completed: 'MEP sleeve verification for L9 services shaft',
    workers_present: 71,
    issues: '2 sleeves offset by 40mm — rework scheduled',
    photo_url: null,
    author: 'Jr. Engineer — A. Sharma',
    status: 'approved',
  },
]

module.exports.rfis = [
  {
    description:
      'Clash between structural drawing STR-09 and MEP drawing M-22 for east stair shaft',
    status: 'open',
    assignee: 'Senior Engineer — P. Deshmukh',
    raised_by: 'Jr. Engineer — A. Sharma',
    raised_at: '2026-04-04T10:20:00+05:30',
    image_url: null,
  },
  {
    description: 'Confirm insulation spec for STP enclosure wall — tender vs GFC mismatch',
    status: 'in_progress',
    assignee: 'Architect — Studio North',
    raised_by: 'PM — K. Iyer',
    raised_at: '2026-04-02T16:05:00+05:30',
    image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop',
  },
  {
    description: 'Rebar lap length at transfer slab — lap schedule sheet missing detail',
    status: 'answered',
    assignee: 'Structural Consultant — Apex',
    raised_by: 'Senior Engineer — P. Deshmukh',
    raised_at: '2026-03-28T09:12:00+05:30',
    image_url: null,
  },
]

module.exports.issues = [
  {
    description: 'Honeycombing observed on south shear wall L6 — 1.2m band',
    severity: 'high',
    status: 'in_progress',
    location: 'Tower A — L6 South',
    raised_at: '2026-04-05T07:55:00+05:30',
    assignee: 'QC — M. Patil',
    photo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop',
  },
  {
    description: 'Scaffold toe-board gap exceeds 180mm on north face',
    severity: 'critical',
    status: 'open',
    location: 'North elevation — Floor 8',
    raised_at: '2026-04-04T18:22:00+05:30',
    assignee: 'Safety Officer — N. Khan',
    photo_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop',
  },
  {
    description: 'Wrong batch certificate for primer — hold area tagged',
    severity: 'medium',
    status: 'resolved',
    location: 'Material laydown',
    raised_at: '2026-04-02T11:40:00+05:30',
    assignee: 'Store — V. Sonawane',
    photo_url: null,
  },
]

module.exports.contacts = [
  {
    name: 'Kavita Iyer',
    role: 'Project Manager',
    phone: '+91 98765 43210',
    email: 'k.iyer@builder.example',
    phase: 'All phases',
  },
  {
    name: 'Pranav Deshmukh',
    role: 'Senior Civil Engineer',
    phone: '+91 91234 55678',
    email: 'p.deshmukh@builder.example',
    phase: 'Structure',
  },
  {
    name: 'Rahul Kulkarni',
    role: 'Site Supervisor',
    phone: '+91 99887 66554',
    email: 'r.kulkarni@builder.example',
    phase: 'Execution',
  },
  {
    name: 'Neha Khan',
    role: 'Safety Officer',
    phone: '+91 90011 22334',
    email: 'n.khan@builder.example',
    phase: 'HSE',
  },
  {
    name: 'Pune RMC Desk',
    role: 'Ready-mix supplier',
    phone: '+91 20 4012 8899',
    email: 'dispatch@rmc-pune.example',
    phase: 'Materials',
  },
]

module.exports.documents = [
  {
    title: 'Structural GFC — Tower A (Rev C)',
    phase: 'structure',
    doc_type: 'drawing',
    file_url: null,
    uploaded_at: '2026-03-15T12:00:00+05:30',
  },
  {
    title: 'Soil investigation summary',
    phase: 'foundation',
    doc_type: 'report',
    file_url: null,
    uploaded_at: '2026-02-01T09:30:00+05:30',
  },
]
