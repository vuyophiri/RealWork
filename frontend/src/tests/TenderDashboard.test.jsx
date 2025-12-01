import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TenderDashboard from '../components/TenderDashboard'

vi.mock('../api', () => ({
  default: {
    get: vi.fn()
  }
}))

import api from '../api'

const renderDashboard = () => render(
  <MemoryRouter>
    <TenderDashboard />
  </MemoryRouter>
)

describe('TenderDashboard', () => {
  let consoleErrorSpy
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
    api.get.mockReset()
  })

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore()
  })

  test('prompts unauthenticated visitors to log in before applying', async () => {
    api.get.mockResolvedValue({ data: [
      {
        _id: 't1',
        title: 'Community Hall Upgrade',
        description: 'Refurbishment of the main hall.',
        sector: 'Public',
        deadline: '2025-12-31T00:00:00.000Z',
        requiredDocs: ['cipc'],
        professionalRequirements: ['cidb']
      }
    ] })

  renderDashboard()
    expect(await screen.findByText('Community Hall Upgrade')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /login to apply/i })).toBeInTheDocument()
  })

  test('shows apply button when profile is verified and meets requirements', async () => {
    localStorage.setItem('token', 'token-123')

    api.get.mockImplementation((url) => {
      if (url === '/tenders') {
        return Promise.resolve({
          data: [
            {
              _id: 't2',
              title: 'Water Treatment Plant',
              description: 'Construct a modular treatment facility.',
              sector: 'Public',
              deadline: '2026-01-15T00:00:00.000Z',
              requiredDocs: ['cipc'],
              professionalRequirements: ['cidb'],
              minYearsExperience: 5,
              minCompletedProjects: 3
            }
          ]
        })
      }
      if (url === '/vendors/me') {
        return Promise.resolve({
          data: {
            status: 'verified',
            documents: [{ type: 'cipc' }],
            professionalRegistrations: [{ body: 'CIDB' }],
            yearsExperience: 8,
            completedProjects: 6
          }
        })
      }
      if (url === '/tenders/suggestions') {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: [] })
    })

  renderDashboard()
    expect(await screen.findByText('Water Treatment Plant')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /apply/i })).toBeInTheDocument()
  })

  test('suggested view toggle fetches personalised tenders', async () => {
    localStorage.setItem('token', 'token-abc')
    api.get.mockImplementation((url) => {
      if (url === '/tenders') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/vendors/me') {
        return Promise.resolve({ data: { status: 'verified', documents: [], professionalRegistrations: [] } })
      }
      if (url === '/tenders/suggestions') {
        return Promise.resolve({
          data: [
            {
              _id: 's1',
              title: 'Solar Installation',
              description: 'Install solar panels across municipal buildings.'
            }
          ]
        })
      }
      return Promise.resolve({ data: [] })
    })

  renderDashboard()
    const toggle = await screen.findByRole('button', { name: /recommended/i })
    await userEvent.click(toggle)
    expect(await screen.findByText('Solar Installation')).toBeInTheDocument()
  })
})
