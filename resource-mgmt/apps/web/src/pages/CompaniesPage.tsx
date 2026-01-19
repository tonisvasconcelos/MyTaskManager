import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  useUploadCompanyLogo,
} from '../shared/api/companies'
import { useDebounce } from '../shared/hooks/useDebounce'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { Skeleton } from '../components/ui/Skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Company } from '../shared/types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getLogoUrl(companyId: string, logoUrl: string | null | undefined): string | null {
  // If logoUrl exists, it should point to the new endpoint
  if (logoUrl) {
    // If already a full URL, return as-is
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl
    }
    // If it's the new format, construct the URL
    if (logoUrl.includes('/api/companies/') && logoUrl.includes('/logo')) {
      return logoUrl.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${logoUrl}` : `${API_BASE_URL.replace('/api', '')}/${logoUrl}`
    }
  }
  
  // Default: use the new endpoint format
  return `${API_BASE_URL}/companies/${companyId}/logo`
}

const companySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  countryCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), 'Use ISO alpha-2 (e.g. PT, BR)')
    .optional()
    .or(z.literal('')),
  invoicingCurrencyCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^[A-Z]{3}$/.test(v), 'Use ISO-4217 (e.g. EUR, USD)')
    .optional()
    .or(z.literal('')),
  taxRegistrationNo: z.string().trim().max(64).optional().or(z.literal('')),
  billingUnit: z.enum(['HR', 'PROJECT']).optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  generalNotes: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>

export function CompaniesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const debouncedSearch = useDebounce(search, 500)
  const { data, isLoading } = useCompanies({ search: debouncedSearch, page, pageSize: 20 })
  const createMutation = useCreateCompany()
  const updateMutation = useUpdateCompany()
  const deleteMutation = useDeleteCompany()
  const uploadLogoMutation = useUploadCompanyLogo()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })

  const openCreateModal = () => {
    setEditingCompany(null)
    setLogoFile(null)
    reset()
    setIsModalOpen(true)
  }

  const openEditModal = (company: Company) => {
    setEditingCompany(company)
    setLogoFile(null)
    reset({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      address: company.address || '',
      notes: company.notes || '',
      countryCode: company.countryCode || '',
      invoicingCurrencyCode: company.invoicingCurrencyCode || '',
      taxRegistrationNo: company.taxRegistrationNo || '',
      billingUnit: company.billingUnit || undefined,
      unitPrice: company.unitPrice ? Number(company.unitPrice) : undefined,
      generalNotes: company.generalNotes || '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (editingCompany) {
        const updated = await updateMutation.mutateAsync({ id: editingCompany.id, ...data })
        if (logoFile) {
          await uploadLogoMutation.mutateAsync({ id: updated.id, file: logoFile })
        }
      } else {
        const created = await createMutation.mutateAsync(data as any)
        if (logoFile) {
          await uploadLogoMutation.mutateAsync({ id: created.id, file: logoFile })
        }
      }
      setIsModalOpen(false)
      setLogoFile(null)
      reset()
    } catch (error) {
      console.error('Error saving company:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('companies.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (error) {
        console.error('Error deleting company:', error)
        alert(t('companies.deleteError'))
      }
    }
  }

  const currencies = useMemo(() => ['EUR', 'USD', 'GBP', 'BRL', 'CAD', 'AUD'], [])

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Companies</h1>
        <Button onClick={openCreateModal}>Create Company</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {data.data.map((company) => (
              <Card key={company.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 flex gap-4">
                    <div className="w-12 h-12 rounded-md overflow-hidden border border-border bg-surface flex items-center justify-center shrink-0">
                      {(() => {
                        const logoUrl = getLogoUrl(company.id, company.logoUrl)
                        return logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${company.name} logo`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent && !parent.querySelector('span')) {
                                const fallback = document.createElement('span')
                                fallback.className = 'text-xs text-text-tertiary'
                                fallback.textContent = company.name.slice(0, 2).toUpperCase()
                                parent.appendChild(fallback)
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs text-text-tertiary">
                            {company.name.slice(0, 2).toUpperCase()}
                          </span>
                        )
                      })()}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">{company.name}</h3>
                    <div className="text-sm text-text-secondary space-y-1">
                      {company.email && <p>📧 {company.email}</p>}
                      {company.phone && <p>📞 {company.phone}</p>}
                      {company.website && (
                        <p>
                          🌐 <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            {company.website}
                          </a>
                        </p>
                      )}
                      {company.address && <p>📍 {company.address}</p>}
                    </div>

                      {(company.invoicingCurrencyCode || company.billingUnit || company.unitPrice) && (
                        <div className="mt-2 text-xs text-text-tertiary">
                          {company.invoicingCurrencyCode && <span className="mr-3">Currency: {company.invoicingCurrencyCode}</span>}
                          {company.billingUnit && <span className="mr-3">Billing: {company.billingUnit}</span>}
                          {company.unitPrice && (
                            <span>
                              Unit Price: {company.unitPrice}
                              {company.invoicingCurrencyCode ? ` ${company.invoicingCurrencyCode}` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(company)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(company.id)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <p className="text-text-secondary text-center py-8">{t('common.noData')}</p>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? t('companies.editCompany') : t('companies.createCompany')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={`${t('companies.name')} *`}
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label={t('companies.email')}
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label={t('companies.phone')}
            {...register('phone')}
            error={errors.phone?.message}
          />
          <Input
            label={t('companies.website')}
            {...register('website')}
            error={errors.website?.message}
          />
          <Input
            label={t('companies.address')}
            {...register('address')}
            error={errors.address?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Country Code (ISO)"
              placeholder="PT"
              {...register('countryCode')}
              error={errors.countryCode?.message}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Invoicing Currency (ISO)
              </label>
              <input
                list="currency-codes"
                className={`input w-full ${errors.invoicingCurrencyCode ? 'border-red-500' : ''}`}
                placeholder="EUR"
                {...register('invoicingCurrencyCode')}
              />
              <datalist id="currency-codes">
                {currencies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.invoicingCurrencyCode?.message && (
                <p className="mt-1 text-sm text-red-400">{errors.invoicingCurrencyCode.message}</p>
              )}
            </div>

            <Input
              label={t('companies.taxRegistrationNo')}
              placeholder="VAT / CNPJ"
              {...register('taxRegistrationNo')}
              error={errors.taxRegistrationNo?.message}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('companies.billingUnit')}
              </label>
              <select className="input w-full" {...register('billingUnit')} defaultValue="">
                <option value="">(not set)</option>
                <option value="HR">HR</option>
                <option value="PROJECT">PROJECT</option>
              </select>
              {errors.billingUnit?.message && (
                <p className="mt-1 text-sm text-red-400">{errors.billingUnit.message}</p>
              )}
            </div>

            <Input
              label={t('companies.unitPrice')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('unitPrice')}
              error={errors.unitPrice?.message}
            />

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('companies.generalNotes')}
              </label>
              <textarea
                className="input w-full min-h-[96px]"
                placeholder="Free text..."
                {...register('generalNotes')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">{t('companies.logo')}</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-text-secondary"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setLogoFile(file)
                }}
              />
              <p className="mt-1 text-xs text-text-tertiary">PNG/JPG up to 10MB.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCompany ? t('common.update') : t('common.create')}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
