# API Endpoint Table — Clinic Management System

## Authentication & Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/users/register | Register user | Public |
| POST | /api/users/login | Login user | Public |
| POST | /api/users/upload-avatar | Upload avatar | Protected |
| POST | /api/users/upload-report | Upload report | Protected |
| DELETE | /api/users/reports/:reportId | Delete report by id | Protected |
| GET | /api/users/profile | Get user profile | Protected |
| PUT | /api/users/profile | Update user profile | Protected |
| DELETE | /api/users/profile | Delete my account | Patient Only |
| POST | /api/users/ | Create user | Admin Only |
| GET | /api/users/ | Get all users | Admin Only |
| GET | /api/users/:id | Get user by id | Admin Only |
| PUT | /api/users/:id | Update user | Admin Only |
| DELETE | /api/users/:id | Delete user | Admin Only |

## Appointments
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/appointments/ | Create appointment | Protected |
| GET | /api/appointments/my | Get my appointments | Protected |
| PUT | /api/appointments/:id | Update appointment | Protected |
| GET | /api/appointments/ | Get all appointments | Admin Only |
| DELETE | /api/appointments/:id | Delete appointment | Admin Only |
| GET | /api/appointments/doctor/my | Get my doctor appointments | Doctor Only |
| GET | /api/appointments/slot/:slotId | Get appointments for time slot | Doctor Only |
| PUT | /api/appointments/:id/status | Update appointment status | Admin/Doctor Only |

## Doctors
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/doctors/me | Get my doctor profile | Doctor Only |
| PUT | /api/doctors/me | Update my doctor profile | Doctor Only |
| GET | /api/doctors/ | Get all doctors | Public |
| GET | /api/doctors/:id | Get doctor by id | Public |
| GET | /api/doctors/admin/all | Get all doctors admin | Admin Only |
| POST | /api/doctors/ | Create doctor profile | Admin Only |
| PUT | /api/doctors/:id | Update doctor profile | Admin Only |
| DELETE | /api/doctors/:id | Delete doctor profile | Admin Only |
| POST | /api/doctors/upload-image | Upload image | Admin Only |

## Services
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/services/ | Get all services | Public |
| GET | /api/services/:id | Get service by id | Public |
| GET | /api/services/admin/all | Get all services admin | Admin Only |
| POST | /api/services/ | Create service | Admin Only |
| PUT | /api/services/:id | Update service | Admin Only |
| DELETE | /api/services/:id | Delete service | Admin Only |
| DELETE | /api/services/:id/hard | Hard delete service | Admin Only |

## Feedback
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/feedback/stats | Get average ratings | Public |
| GET | /api/feedback/ | Get all feedback | Public |
| GET | /api/feedback/:id | Get feedback by id | Public |
| POST | /api/feedback/ | Create feedback | Protected |
| PUT | /api/feedback/:id | Update feedback | Protected |
| DELETE | /api/feedback/:id | Delete feedback | Protected |

## Announcements
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/announcements/ | Get all announcements | Public |
| GET | /api/announcements/:id | Get announcement by id | Public |
| GET | /api/announcements/admin/all | Get all announcements admin | Admin Only |
| POST | /api/announcements/ | Create announcement | Admin Only |
| PUT | /api/announcements/:id | Update announcement | Admin Only |
| DELETE | /api/announcements/:id | Delete announcement | Admin Only |
| DELETE | /api/announcements/:id/hard | Hard delete announcement | Admin Only |

## Time Slots
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/timeslots/ | Get time slots | Protected |
| GET | /api/timeslots/doctor/my | Get my doctor time slots | Doctor Only |
| POST | /api/timeslots/ | Create time slot | Admin Only |
| PUT | /api/timeslots/:id | Update time slot | Admin Only |
| DELETE | /api/timeslots/:id | Delete time slot | Admin Only |

## Health Screening
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/health-screening/ | Screen patient | Protected |
| GET | /api/health-screening/my | Get my screenings | Protected |
| GET | /api/health-screening/model-info | Get ai model info | Admin Only |
| GET | /api/health-screening/:id | Get screening by id | Protected |

## Symptom Triage
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/triage/ | Triage symptoms | Public |

## System Health
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | /api/health | Check system health | Public |
