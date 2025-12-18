import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TenderDashboard from '../components/TenderDashboard'

// Mock the API module to control test data and avoid real HTTP calls
vi.mock('../api', () => ({
  default: {
    get: vi.fn()
  }
}))

import api from '../api'

// Helper function to render TenderDashboard with required router context
const renderDashboard = () => render(
  <MemoryRouter>
    <TenderDashboard />
  </MemoryRouter>
)

describe('TenderDashboard', () => {
  let consoleErrorSpy

  // Setup before each test - spy on console.error to suppress expected errors
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.clear()
    api.get.mockReset()
  })

  // Cleanup after each test
  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore()
  })

  // Test: Verify unauthenticated users see login prompt instead of apply button
  test('prompts unauthenticated visitors to log in before applying', async () => {
    // Mock API response with sample tender data
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

    // Verify tender displays and login link is shown
    expect(await screen.findByText('Community Hall Upgrade')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /login to apply/i })).toBeInTheDocument()
  })

  // Test: Verify authenticated users with verified profiles can apply
  test('shows apply button when profile is verified and meets requirements', async () => {
    // Simulate authenticated user
    localStorage.setItem('token', 'token-123')

    // Mock API responses for tenders, vendor profile, and suggestions
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

    // Verify tender displays and apply button is available
    expect(await screen.findByText('Water Treatment Plant')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /apply/i })).toBeInTheDocument()
  })

  // Test: Verify recommended tenders toggle functionality
  test('suggested view toggle fetches personalised tenders', async () => {
    // Simulate authenticated user
    localStorage.setItem('token', 'token-abc')

    // Mock API responses
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

    // Find and click the recommended toggle button
    const toggle = await screen.findByRole('button', { name: /recommended/i })
    await userEvent.click(toggle)

    // Verify recommended tenders are displayed
    expect(await screen.findByText('Solar Installation')).toBeInTheDocument()
  })
})
