const EmergencyIncident = require('../models/EmergencyIncident')
const { serializeDoc, serializeDocs } = require('../utils/serialize')

function toDto(row) {
  const obj = serializeDoc(row)
  return {
    id: obj.id,
    type: obj.type,
    severity: obj.severity,
    status: obj.status,
    zone: obj.zone,
    description: obj.description || '',
    reported_by: obj.reported_by,
    assignment: obj.assignment || {},
    audit: Array.isArray(obj.audit) ? obj.audit : [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

async function listEmergency(req, res) {
  const rows = await EmergencyIncident.find({ project: req.project._id })
    .sort({ createdAt: -1 })
    .limit(100)
  res.json({ incidents: rows.map(toDto) })
}

async function createEmergency(req, res) {
  const { type, severity, zone, description, photo_url, reported_by } = req.body
  const zoneName = String(zone || '').trim()
  const typeName = String(type || '').trim()
  if (!typeName || !zoneName) {
    res.status(400).json({ message: 'type and zone are required.' })
    return
  }

  const reporterName = reported_by || req.user?.name || req.user?.email || 'Unknown'

  const incident = await EmergencyIncident.create({
    project: req.project._id,
    type: typeName,
    severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'high',
    zone: zoneName,
    description: String(description || ''),
    photo_url: photo_url || null,
    reported_by: reporterName,
    audit: [
      {
        kind: 'raised',
        by: reporterName,
        at: new Date().toISOString(),
        message: String(description || ''),
      },
    ],
  })

  res.status(201).json({ incident: toDto(incident) })
}

async function updateEmergency(req, res) {
  const incident = await EmergencyIncident.findOne({
    _id: req.params.incidentId,
    project: req.project._id,
  })
  if (!incident) {
    res.status(404).json({ message: 'Emergency incident not found.' })
    return
  }

  const { status, assignment, note } = req.body
  const actorName = req.user?.name || req.user?.email || 'Unknown'

  const VALID_STATUSES = ['raised', 'acknowledged', 'responding', 'resolved', 'archived']
  if (status && VALID_STATUSES.includes(status)) {
    incident.status = status
    incident.audit.push({
      kind: status,
      by: actorName,
      at: new Date().toISOString(),
      note: note || undefined,
    })
  }

  if (assignment) {
    incident.assignment = { ...(incident.assignment?.toObject?.() || incident.assignment || {}), ...assignment }
  }

  if (note && !status) {
    incident.audit.push({
      kind: 'note',
      by: actorName,
      at: new Date().toISOString(),
      note,
    })
  }

  await incident.save()
  res.json({ incident: toDto(incident) })
}

module.exports = { listEmergency, createEmergency, updateEmergency }
