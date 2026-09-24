import { FormDialog, SelectField, TextField, TextareaField } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Briefcase, Building2, Phone, Scale, SquarePen } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Company Profile', href: '/company-profile' }];

type Profile = Record<string, string>;

export default function CompanyProfile({
    profile,
    options,
}: {
    profile: Profile;
    options: { businessTypes: string[]; practiceSizes: string[] };
}) {
    const [open, setOpen] = useState(false);
    const form = useForm<Profile>({ ...profile });

    function openEdit() {
        form.setData({ ...profile });
        form.clearErrors();
        setOpen(true);
    }

    const set = (key: string) => (value: string) => form.setData(key, value);

    /** A fee is shown in the firm's own currency rather than as a bare number. */
    const fee = profile.consultation_fee ? money(Math.round(Number(profile.consultation_fee) * 100)) : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Profile" />

            <div className="flex flex-1 flex-col gap-4 px-3 pt-4 pb-12 lg:px-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Company Profile</h1>
                        <p className="text-xs text-muted-foreground">Detailed view of advocate, firm, and professional information.</p>
                    </div>
                    <Button onClick={openEdit}>
                        <SquarePen className="size-4" /> Edit Profile
                    </Button>
                </div>

                <div className="rounded-xl border p-3 lg:p-6">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                        <aside className="w-full shrink-0 lg:w-[340px]">
                            <Panel icon={Building2} title="Firm Info" bodyClassName="px-5 py-4">
                                <div className="grid grid-cols-1 gap-y-3">
                                    <Value label="Firm Name" value={profile.firm_name} />
                                    <Value label="Business Type" value={profile.business_type} />
                                    <Value label="Years of Experience" value={profile.years_experience} />
                                    <Value label="Practice Size" value={profile.practice_size} />
                                    <Value label="Bar Registration No." value={profile.bar_registration_no} />
                                    <Value label="Registration No." value={profile.registration_no} />
                                    <Value label="Established" value={profile.established_on} />
                                </div>
                            </Panel>
                        </aside>

                        <div className="min-w-0 flex-1 space-y-4">
                            <Panel icon={Phone} title="Personal &amp; Contact Details">
                                <Grid>
                                    <Value label="Advocate Name" value={profile.advocate_name} />
                                    <Value label="Email" value={profile.firm_email} />
                                    <Value label="Phone" value={profile.firm_phone} />
                                    <Value label="Website" value={profile.firm_website} />
                                    <Value label="Consultation Fees" value={fee} />
                                    <Value label="Office Hours" value={profile.office_hours} />
                                    <Value label="Address" value={profile.firm_address} wide />
                                </Grid>
                            </Panel>

                            <Panel icon={Briefcase} title="Professional Details">
                                <Grid>
                                    <Value label="Law Degree" value={profile.law_degree} />
                                    <Value label="University" value={profile.university} />
                                    <Value label="Languages Spoken" value={profile.languages_spoken} />
                                    <Value label="Success Rate (%)" value={profile.success_rate} />
                                    <Value label="Specialization" value={profile.specialization} wide />
                                    <Value label="Court Jurisdictions" value={profile.court_jurisdictions} wide />
                                </Grid>
                            </Panel>

                            <Panel icon={Scale} title="Business &amp; Firm Details">
                                <Grid>
                                    <Value label="Services Offered" value={profile.services_offered} wide />
                                    <Value label="Notable Cases" value={profile.notable_cases} wide />
                                    <Value label="Description" value={profile.firm_description} wide />
                                </Grid>
                            </Panel>
                        </div>
                    </div>
                </div>

                <FormDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="Edit Profile"
                    processing={form.processing}
                    submitLabel="Save"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.put('/company-profile', { onSuccess: () => setOpen(false), preserveScroll: true });
                    }}
                    wide
                >
                    <TextField label="Firm Name" value={form.data.firm_name} onChange={set('firm_name')} error={form.errors.firm_name} />
                    <TextField label="Advocate Name" value={form.data.advocate_name} onChange={set('advocate_name')} error={form.errors.advocate_name} />
                    <SelectField
                        label="Business Type"
                        value={form.data.business_type}
                        onChange={set('business_type')}
                        options={options.businessTypes.map((t) => ({ value: t, label: t }))}
                        error={form.errors.business_type}
                    />
                    <SelectField
                        label="Practice Size"
                        value={form.data.practice_size}
                        onChange={set('practice_size')}
                        options={options.practiceSizes.map((t) => ({ value: t, label: t }))}
                        error={form.errors.practice_size}
                    />
                    <TextField
                        label="Years of Experience"
                        type="number"
                        value={form.data.years_experience}
                        onChange={set('years_experience')}
                        error={form.errors.years_experience}
                    />
                    <TextField label="Established" type="date" value={form.data.established_on} onChange={set('established_on')} error={form.errors.established_on} />
                    <TextField
                        label="Bar Registration No."
                        value={form.data.bar_registration_no}
                        onChange={set('bar_registration_no')}
                        error={form.errors.bar_registration_no}
                    />
                    <TextField label="Registration No." value={form.data.registration_no} onChange={set('registration_no')} error={form.errors.registration_no} />
                    <TextField label="Email" type="email" value={form.data.firm_email} onChange={set('firm_email')} error={form.errors.firm_email} />
                    <TextField label="Phone" value={form.data.firm_phone} onChange={set('firm_phone')} error={form.errors.firm_phone} />
                    <TextField label="Website" value={form.data.firm_website} onChange={set('firm_website')} error={form.errors.firm_website} />
                    <TextField
                        label="Consultation Fees"
                        type="number"
                        value={form.data.consultation_fee}
                        onChange={set('consultation_fee')}
                        error={form.errors.consultation_fee}
                    />
                    <TextField label="Office Hours" value={form.data.office_hours} onChange={set('office_hours')} error={form.errors.office_hours} className="sm:col-span-2" />
                    <TextareaField label="Address" value={form.data.firm_address} onChange={set('firm_address')} error={form.errors.firm_address} className="sm:col-span-2" />
                    <TextField label="Law Degree" value={form.data.law_degree} onChange={set('law_degree')} error={form.errors.law_degree} />
                    <TextField label="University" value={form.data.university} onChange={set('university')} error={form.errors.university} />
                    <TextField
                        label="Languages Spoken"
                        value={form.data.languages_spoken}
                        onChange={set('languages_spoken')}
                        error={form.errors.languages_spoken}
                    />
                    <TextField
                        label="Success Rate (%)"
                        type="number"
                        value={form.data.success_rate}
                        onChange={set('success_rate')}
                        error={form.errors.success_rate}
                    />
                    <TextareaField
                        label="Specialization"
                        value={form.data.specialization}
                        onChange={set('specialization')}
                        error={form.errors.specialization}
                        className="sm:col-span-2"
                    />
                    <TextareaField
                        label="Court Jurisdictions"
                        value={form.data.court_jurisdictions}
                        onChange={set('court_jurisdictions')}
                        error={form.errors.court_jurisdictions}
                        className="sm:col-span-2"
                    />
                    <TextareaField
                        label="Services Offered"
                        value={form.data.services_offered}
                        onChange={set('services_offered')}
                        error={form.errors.services_offered}
                        className="sm:col-span-2"
                    />
                    <TextareaField
                        label="Notable Cases"
                        value={form.data.notable_cases}
                        onChange={set('notable_cases')}
                        error={form.errors.notable_cases}
                        className="sm:col-span-2"
                    />
                    <TextareaField
                        label="Description"
                        value={form.data.firm_description}
                        onChange={set('firm_description')}
                        error={form.errors.firm_description}
                        className="sm:col-span-2"
                    />
                </FormDialog>
            </div>
        </AppLayout>
    );
}

function Panel({
    icon: Icon,
    title,
    children,
    bodyClassName,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    children: ReactNode;
    bodyClassName?: string;
}) {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 border-b px-5 py-3 lg:px-6 lg:py-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                    <Icon className="size-4 text-muted-foreground" />
                    {title}
                </h3>
            </div>
            <div className={cn('px-6 py-5', bodyClassName)}>{children}</div>
        </div>
    );
}

function Grid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{children}</div>;
}

function Value({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
    return (
        <div className={cn('min-w-0 space-y-0.5', wide && 'sm:col-span-2')}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium break-all sm:break-words">{value?.trim() ? value : '—'}</p>
        </div>
    );
}
