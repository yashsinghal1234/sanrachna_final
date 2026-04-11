function serializeDoc(doc) {
  if (!doc) return null
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : { ...doc }
  if (o._id) {
    o.id = String(o._id)
    delete o._id
  }
  delete o.__v
  if (o.password) delete o.password
  return o
}

function serializeDocs(docs) {
  return docs.map((d) => serializeDoc(d))
}

module.exports = { serializeDoc, serializeDocs }
