migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.createRule = null
  users.deleteRule = null
  app.save(users)

  const companies = new Collection({
    type: "base",
    name: "companies",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.body.owner = @request.auth.id",
    updateRule: "owner = @request.auth.id && @request.body.owner:changed = false",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "name", type: "text", required: true, max: 160 },
      { name: "website", type: "url" },
    ],
    indexes: ["CREATE INDEX idx_companies_owner ON companies (owner)"],
  })
  app.save(companies)

  const contacts = new Collection({
    type: "base",
    name: "contacts",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.body.owner = @request.auth.id",
    updateRule: "owner = @request.auth.id && @request.body.owner:changed = false",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "company", type: "relation", maxSelect: 1, collectionId: companies.id, cascadeDelete: false },
      { name: "name", type: "text", required: true, max: 160 },
      { name: "email", type: "email" },
      { name: "phone", type: "text", max: 40 },
    ],
    indexes: ["CREATE INDEX idx_contacts_owner ON contacts (owner)"],
  })
  app.save(contacts)

  const deals = new Collection({
    type: "base",
    name: "deals",
    listRule: "owner = @request.auth.id",
    viewRule: "owner = @request.auth.id",
    createRule: "@request.body.owner = @request.auth.id",
    updateRule: "owner = @request.auth.id && @request.body.owner:changed = false",
    deleteRule: "owner = @request.auth.id",
    fields: [
      { name: "owner", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      { name: "company", type: "relation", maxSelect: 1, collectionId: companies.id, cascadeDelete: false },
      { name: "contact", type: "relation", maxSelect: 1, collectionId: contacts.id, cascadeDelete: false },
      { name: "title", type: "text", required: true, max: 180 },
      { name: "amount", type: "number", min: 0 },
      { name: "stage", type: "select", required: true, maxSelect: 1, values: ["lead", "qualified", "proposal", "won", "lost"] },
    ],
    indexes: ["CREATE INDEX idx_deals_owner_stage ON deals (owner, stage)"],
  })
  app.save(deals)
}, (app) => {
  for (const name of ["deals", "contacts", "companies"]) {
    app.delete(app.findCollectionByNameOrId(name))
  }
  const users = app.findCollectionByNameOrId("users")
  users.createRule = ""
  users.deleteRule = "id = @request.auth.id"
  app.save(users)
})
