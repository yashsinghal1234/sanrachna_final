const EmergencyIncident = require('../models/EmergencyIncident')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

async function listEmergency(req, res) {
  const rows = await EmergencyIncident.find({ project: req.project._id }).sort({ createdAt: -1 }).limit(100)
  res.json({ incidents: serializeDocs(rows) })
}

async function createEmergency(req, res) {
  const { type, severity, zone, description, photo_url } = req.body
  const zoneName = String(zone || '').trim()
  const typeName = String(type || '').trim()
  if (!typeName || !zoneName) {
    res.status(400).json({ message: 'type and zone are required.' })
    return
  }

  const incident = await EmergencyIncident.create({
    project: req.project._id,
    type: typeName,
    severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'high',
    zone: zoneName,
    description: String(description || ''),
    photo_url: photo_url || null,
    reported_by: req.user.name,
    audit: [{ kind: 'raised', by: req.user.name, at: new Date().toISOString() }],
  })

  res.status(201).json({ incident: serializeDoc(incident) })
}

async function updateEmergency(req, res) {
  const incident = await EmergencyIncident.findOne({ _id: req.params.incidentId, project: req.project._id })
  if (!incident) {
    res.status(404).json({ message: 'Emergency incident not found.' })
    return
  }

  const { status, assignment, note } = req.body
  if (status && ['raised', 'acknowledged', 'responding', 'resolved', 'archived'].includes(status)) {
    incident.status = status
  }
  if (assignment) incident.assignment = { ...(incident.assignment || {}), ...assignment }
  if (note) incident.audit.push({ kind: 'note', by: req.user.name, at: new Date().toISOString(), note })
  await incident.save()
  res.json({ incident: serializeDoc(incident) })
}

module.exports = { listEmergency, createEmergency, updateEmergency }
