export function toClient(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: String(_id), ...rest };
}
export function toClientArray(docs) {
  return docs.map(toClient);
}
