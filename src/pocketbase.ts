import PocketBase, { type RecordModel } from 'pocketbase'

export const pb = new PocketBase(import.meta.env['VITE_POCKETBASE_URL'] || window.location.origin)

pb.autoCancellation(false)

export type Company = Readonly<{
  id: string
  name: string
  website: string
  created: string
}>

export type Contact = Readonly<{
  id: string
  name: string
  email: string
  phone: string
  company: string
  created: string
}>

export type Deal = Readonly<{
  id: string
  title: string
  amount: number
  stage: string
  company: string
  contact: string
  created: string
}>

const text = (record: RecordModel, key: string): string => {
  const value: unknown = record[key]
  return typeof value === 'string' ? value : ''
}

const number = (record: RecordModel, key: string): number => {
  const value: unknown = record[key]
  return typeof value === 'number' ? value : 0
}

export const toCompany = (record: RecordModel): Company => ({
  id: record.id,
  name: text(record, 'name'),
  website: text(record, 'website'),
  created: text(record, 'created'),
})

export const toContact = (record: RecordModel): Contact => ({
  id: record.id,
  name: text(record, 'name'),
  email: text(record, 'email'),
  phone: text(record, 'phone'),
  company: text(record, 'company'),
  created: text(record, 'created'),
})

export const toDeal = (record: RecordModel): Deal => ({
  id: record.id,
  title: text(record, 'title'),
  amount: number(record, 'amount'),
  stage: text(record, 'stage'),
  company: text(record, 'company'),
  contact: text(record, 'contact'),
  created: text(record, 'created'),
})
