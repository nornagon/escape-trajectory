/**
 * Serialization contract:
 *
 * Serializable classes must either be constructable with no arguments, or have
 * a static createEmpty(props) method that returns an empty instance of the
 * class.
 *
 * obj.serialize must return a plain JavaScript object, with members that can
 * be structuredClone()d. obj.serialize() is passed a helper function that
 * must be used to serialize any references to other objects. This allows
 * circular references to be handled correctly.
 *
 * obj.deserialize should initialize the object from the serialized data. It
 * is passed a helper function that must be used to deserialize any references
 * to other objects.
 */
export function serialize(obj) {
  const vault = new Map()
  function serialize(obj) {
    if (vault.has(obj)) return vault.get(obj)
    const serialized = {}
    vault.set(obj, serialized)
    Object.assign(serialized, obj.serialize(serialize))
    return serialized
  }
  return serialize(obj)
}

export function deserialize(cls, obj) {
  const vault = new Map()
  function deserialize(cls, obj) {
    if (vault.has(obj)) return vault.get(obj)
    const deserialized = cls.createEmpty?.(obj) ?? new cls()
    vault.set(obj, deserialized)
    deserialized.deserialize(obj, deserialize)
    return deserialized
  }
  return deserialize(cls, obj)
}
