import { http, HttpResponse } from 'msw'

// Mock data generators
const generateSample = (overrides = {}) => ({
  id: Math.floor(Math.random() * 1000),
  lab_number: `LAB${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
  case_number: `CASE${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  name: 'John',
  surname: 'Doe',
  workflow_status: 'sample_collected',
  collection_date: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  report_generated: false,
  ...overrides,
})

const generateWorkflowStatus = () => ({
  stageDistribution: [
    { workflow_status: 'sample_collected', count: 5 },
    { workflow_status: 'pcr_ready', count: 3 },
    { workflow_status: 'pcr_batched', count: 2 },
    { workflow_status: 'pcr_completed', count: 4 },
    { workflow_status: 'electro_ready', count: 1 },
    { workflow_status: 'electro_batched', count: 2 },
    { workflow_status: 'electro_completed', count: 3 },
    { workflow_status: 'analysis_ready', count: 1 },
    { workflow_status: 'analysis_completed', count: 2 },
    { workflow_status: 'report_ready', count: 1 },
    { workflow_status: 'report_sent', count: 6 }
  ],
  totalSamples: 30,
  cyclesCompleted: 15,
  isRunning: true
})

const generateBatch = (overrides = {}) => ({
  id: Math.floor(Math.random() * 100),
  batch_number: `BATCH${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  status: 'processing',
  created_at: new Date().toISOString(),
  ...overrides,
})

const generateStageDuration = (stage_name, duration_minutes = 5) => ({
  stage_name,
  duration_minutes,
  updated_at: new Date().toISOString()
})

export const handlers = [
  // Authentication endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json()
    
    if (username === 'testuser' && password === 'testpass') {
      return HttpResponse.json({
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          role: 'staff',
          name: 'Test User'
        }
      })
    }
    
    return HttpResponse.json(
      { 
        success: false, 
        error: { message: 'Invalid credentials' } 
      },
      { status: 401 }
    )
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader === 'Bearer mock-jwt-token') {
      return HttpResponse.json({
        success: true,
        data: {
          id: 1,
          username: 'testuser',
          role: 'staff',
          name: 'Test User'
        }
      })
    }
    
    return HttpResponse.json(
      { success: false, error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  // Samples endpoints
  http.get('/api/samples', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const status = url.searchParams.get('status')
    
    let samples = Array.from({ length: 25 }, (_, i) => generateSample({
      id: i + 1,
      workflow_status: ['sample_collected', 'pcr_ready', 'analysis_completed'][i % 3]
    }))
    
    if (status && status !== 'all') {
      samples = samples.filter(s => s.workflow_status === status)
    }
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedSamples = samples.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      success: true,
      samples: paginatedSamples,
      pagination: {
        total: samples.length,
        page,
        limit,
        totalPages: Math.ceil(samples.length / limit)
      }
    })
  }),

  http.post('/api/samples', async ({ request }) => {
    const sampleData = await request.json()
    const newSample = generateSample(sampleData)
    
    return HttpResponse.json({
      success: true,
      data: newSample
    })
  }),

  http.get('/api/samples/counts', () => {
    return HttpResponse.json({
      success: true,
      data: {
        total: 25,
        pending: 5,
        processing: 10,
        completed: 8,
        failed: 2
      }
    })
  }),

  // Batches endpoints
  http.get('/api/batches', () => {
    const batches = Array.from({ length: 5 }, (_, i) => generateBatch({
      id: i + 1,
      status: ['processing', 'completed', 'pending'][i % 3]
    }))
    
    return HttpResponse.json({
      success: true,
      batches
    })
  }),

  http.get('/api/batches/:id', ({ params }) => {
    const batch = generateBatch({ id: parseInt(params.id) })
    
    return HttpResponse.json({
      success: true,
      data: batch
    })
  }),

  // Workflow endpoints
  http.get('/api/workflow/paternity/status', () => {
    return HttpResponse.json({
      success: true,
      data: generateWorkflowStatus()
    })
  }),

  http.get('/api/workflow/sample-tracking', () => {
    return HttpResponse.json({
      success: true,
      data: {
        activeSamples: 25,
        averageProcessingTime: '2.5 hours',
        bottlenecks: ['PCR Amplification']
      }
    })
  }),

  http.get('/api/workflow-status', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalSamples: 25,
        stagesCompleted: 15,
        averageTime: 45
      }
    })
  }),

  // Workflow stage durations endpoints
  http.get('/api/workflow/stage-durations', () => {
    const stages = [
      'sample_collection',
      'dna_extraction', 
      'pcr_amplification',
      'electrophoresis',
      'osiris_analysis',
      'report_generation'
    ]
    
    const durations = stages.map(stage => 
      generateStageDuration(stage, Math.floor(Math.random() * 30) + 5)
    )
    
    return HttpResponse.json({
      success: true,
      data: durations
    })
  }),

  http.put('/api/workflow/stage-durations/:stage', async ({ params, request }) => {
    const { duration_minutes } = await request.json()
    
    return HttpResponse.json({
      success: true,
      data: generateStageDuration(params.stage, duration_minutes)
    })
  }),

  // Health check
  http.get('/api/test', () => {
    return HttpResponse.json({
      success: true,
      message: 'API is working'
    })
  }),

  // Reports endpoints
  http.get('/api/reports', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    
    const reports = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      title: `Report ${i + 1}`,
      status: ['draft', 'final', 'sent'][i % 3],
      created_at: new Date().toISOString()
    }))
    
    const filteredReports = status ? 
      reports.filter(r => r.status === status) : 
      reports
    
    return HttpResponse.json({
      success: true,
      data: filteredReports
    })
  }),

  // Equipment endpoints
  http.get('/api/equipment', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 1, name: '3500 Genetic Analyzer', status: 'operational' },
        { id: 2, name: 'PCR Thermocycler', status: 'maintenance' }
      ]
    })
  }),

  // Quality Control endpoints
  http.get('/api/quality-control', ({ request }) => {
    const url = new URL(request.url)
    const batchId = url.searchParams.get('batch_id')
    
    return HttpResponse.json({
      success: true,
      data: {
        batch_id: batchId || null,
        controls_passed: true,
        checks: ['DNA Concentration', 'Purity', 'Contamination'],
        results: ['Pass', 'Pass', 'Pass']
      }
    })
  }),

  // Default fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { success: false, error: { message: 'Not found' } },
      { status: 404 }
    )
  })
]