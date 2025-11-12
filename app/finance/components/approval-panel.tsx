'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Eye, CheckCircle, XCircle, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { toast } from 'sonner'
import { FinanceRequest, Liquidation, Receipt } from './finance-types'
import { formatRequestId, formatLiquidationId } from './finance-utils'
import { ReceiptViewer } from './receipt-viewer'
import { toAbsoluteUrl, isValidUrl, encodeUrlPath } from '@/lib/url-utils'

interface Department {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface ApprovalPanelProps {
  requests: FinanceRequest[]
  liquidations: Liquidation[]
  onApproveRequest: (requestId: string) => void
  onRejectRequest: (requestId: string, reason: string) => void
  onApproveLiquidation: (liquidationId: string) => void
  onRejectLiquidation: (liquidationId: string, reason: string) => void
}

export function ApprovalPanel({ 
  requests, 
  liquidations, 
  onApproveRequest, 
  onRejectRequest, 
  onApproveLiquidation, 
  onRejectLiquidation 
}: ApprovalPanelProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [rejectType, setRejectType] = useState<'request' | 'liquidation'>('request')
  const [rejectId, setRejectId] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [viewingReceipt, setViewingReceipt] = useState<{
    fileUrl: string
    fileName: string
    fileType: string
    isOpen: boolean
  } | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  
  // Pagination states
  const [requestsPage, setRequestsPage] = useState(1)
  const [liquidationsPage, setLiquidationsPage] = useState(1)
  const itemsPerPage = 5

  // Fetch departments and projects
  useEffect(() => {
    const fetchDepartmentsAndProjects = async () => {
      try {
        // Fetch departments
        const deptResponse = await fetch('/api/departments')
        if (deptResponse.ok) {
          const deptData = await deptResponse.json()
          setDepartments(deptData.departments || [])
        }

        // Fetch projects
        const projResponse = await fetch('/api/projects')
        if (projResponse.ok) {
          const projData = await projResponse.json()
          setProjects(projData.projects || [])
        }
      } catch (error) {
        console.error('Error fetching departments/projects:', error)
      }
    }

    fetchDepartmentsAndProjects()
  }, [])

  const getDepartmentName = (deptId: string) => {
    const department = departments.find(dept => dept.id === deptId)
    return department ? department.name : deptId
  }

  const getProjectName = (projId: string) => {
    const project = projects.find(proj => proj.id === projId)
    return project ? project.name : projId
  }

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    if (rejectType === 'request') {
      onRejectRequest(rejectId, rejectReason)
    } else {
      onRejectLiquidation(rejectId, rejectReason)
    }

    setRejectReason('')
    setIsRejectDialogOpen(false)
    toast.success('Rejected successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
  }

  const openRejectDialog = (type: 'request' | 'liquidation', id: string) => {
    setRejectType(type)
    setRejectId(id)
    setIsRejectDialogOpen(true)
  }

  const handleViewReceipt = (fileUrl: string | undefined, fileName: string = 'receipt') => {
    console.log('Attempting to view receipt:', { fileUrl, fileName });
    
    // Check if fileUrl exists and is not empty
    if (!fileUrl || fileUrl.trim() === '') {
      toast.error('No receipt file available', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    // Ensure we have a valid URL
    let validFileUrl = fileUrl.trim()
    
    // Validate the URL
    if (!isValidUrl(validFileUrl)) {
      toast.error('Invalid file URL', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    // If it's a relative path, make it absolute
    validFileUrl = toAbsoluteUrl(validFileUrl)
    
    // Encode the URL to handle special characters
    validFileUrl = encodeUrlPath(validFileUrl)
    
    // Determine file type from URL or extension
    let fileType = 'application/octet-stream'
    if (validFileUrl && typeof validFileUrl === 'string' && validFileUrl.endsWith && validFileUrl.endsWith('.pdf')) {
      fileType = 'application/pdf'
    } else if (validFileUrl && typeof validFileUrl === 'string' && validFileUrl.match && validFileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
      fileType = 'image/jpeg' // Default to jpeg, will be corrected by browser
    }
    
    console.log('Opening receipt viewer with:', { validFileUrl, fileName, fileType });
    
    setViewingReceipt({
      fileUrl: validFileUrl,
      fileName,
      fileType,
      isOpen: true
    })
  }

  const closeReceiptViewer = () => {
    setViewingReceipt(null)
  }

  // CSV Export function
  const exportToCSV = () => {
    // Combine all requests and liquidations for export
    const allActivity = [
      ...requests.map(req => ({
        type: 'Request',
        id: formatRequestId(req.id),
        requester: req.requesterName,
        role: req.requesterRole,
        department: getDepartmentName(req.department),
        project: req.project ? getProjectName(req.project) : 'N/A',
        amount: req.amount,
        currency: req.currency,
        purpose: req.purpose,
        status: req.status,
        createdAt: req.createdAt instanceof Date 
          ? req.createdAt.toLocaleDateString('en-GB') 
          : new Date(req.createdAt).toLocaleDateString('en-GB'),
        updatedAt: req.updatedAt instanceof Date 
          ? req.updatedAt.toLocaleDateString('en-GB') 
          : new Date(req.updatedAt).toLocaleDateString('en-GB'),
        approvedAt: req.approvedAt ? (
          req.approvedAt instanceof Date 
            ? req.approvedAt.toLocaleDateString('en-GB') 
            : new Date(req.approvedAt).toLocaleDateString('en-GB')
        ) : 'N/A',
        approvedBy: req.approvedBy || 'N/A',
        rejectionReason: req.rejectionReason || 'N/A'
      })),
      ...liquidations.map(liq => ({
        type: 'Liquidation',
        id: formatLiquidationId(liq.id),
        requester: liq.requesterName,
        role: liq.requesterRole,
        department: 'N/A', // Liquidations don't have department directly
        project: 'N/A', // Liquidations don't have project directly
        amount: liq.amount,
        currency: liq.currency,
        purpose: liq.purpose,
        status: liq.status,
        createdAt: liq.createdAt instanceof Date 
          ? liq.createdAt.toLocaleDateString('en-GB') 
          : new Date(liq.createdAt).toLocaleDateString('en-GB'),
        updatedAt: liq.updatedAt instanceof Date 
          ? liq.updatedAt.toLocaleDateString('en-GB') 
          : new Date(liq.updatedAt).toLocaleDateString('en-GB'),
        approvedAt: liq.approvedAt ? (
          liq.approvedAt instanceof Date 
            ? liq.approvedAt.toLocaleDateString('en-GB') 
            : new Date(liq.approvedAt).toLocaleDateString('en-GB')
        ) : 'N/A',
        approvedBy: liq.approvedBy || 'N/A',
        rejectionReason: liq.rejectionReason || 'N/A'
      }))
    ]

    // Create CSV content
    const headers = [
      'Type',
      'ID',
      'Requester',
      'Role',
      'Department',
      'Project',
      'Amount',
      'Currency',
      'Purpose',
      'Status',
      'Created At',
      'Updated At',
      'Approved At',
      'Approved By',
      'Rejection Reason'
    ]

    const csvContent = [
      headers.join(','),
      ...allActivity.map(item => 
        headers.map(header => {
          // Fix the key mapping to properly access the fields
          let key: string;
          switch (header) {
            case 'Created At':
              key = 'createdAt';
              break;
            case 'Updated At':
              key = 'updatedAt';
              break;
            case 'Approved At':
              key = 'approvedAt';
              break;
            case 'Approved By':
              key = 'approvedBy';
              break;
            case 'Rejection Reason':
              key = 'rejectionReason';
              break;
            default:
              key = header.toLowerCase().replace(/ /g, '');
          }
          const value = item[key as keyof typeof item]
          // Escape commas and wrap in quotes if needed
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `activity_history_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const pendingRequests = requests.filter(req => req.status === 'pending')
  const pendingLiquidations = liquidations.filter(liq => 
    liq.status === 'submitted' || 
    liq.status === 'under-review' || 
    liq.status === 'rejected'
  )
  
  // Pagination calculations
  const totalRequestsPages = Math.ceil(pendingRequests.length / itemsPerPage)
  const totalLiquidationsPages = Math.ceil(pendingLiquidations.length / itemsPerPage)
  
  const requestsToDisplay = pendingRequests.slice(
    (requestsPage - 1) * itemsPerPage,
    requestsPage * itemsPerPage
  )
  
  const liquidationsToDisplay = pendingLiquidations.slice(
    (liquidationsPage - 1) * itemsPerPage,
    liquidationsPage * itemsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        {/* Pending Requests */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Pending Requests</CardTitle>
            <CardDescription>{pendingRequests.length} requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending requests</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsToDisplay.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{formatRequestId(request.id)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.requesterName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {request.requesterRole}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>K{request.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {request.createdAt instanceof Date 
                            ? request.createdAt.toLocaleDateString('en-GB') 
                            : new Date(request.createdAt).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className='cursor-pointer'>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Request Details</DialogTitle>
                                  <DialogDescription>Request ID: {formatRequestId(request.id)}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Requester</Label>
                                      <p className="font-medium">{request.requesterName}</p>
                                    </div>
                                    <div>
                                      <Label>Role</Label>
                                      <p className="font-medium">{request.requesterRole}</p>
                                    </div>
                                    <div>
                                      <Label>Amount</Label>
                                      <p className="font-medium">K{request.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <Label>Department</Label>
                                      <p className="font-medium">{getDepartmentName(request.department)}</p>
                                    </div>
                                    <div>
                                      <Label>Date</Label>
                                      <p className="font-medium">
                                        {request.createdAt instanceof Date 
                                          ? request.createdAt.toLocaleDateString('en-GB', { hour: 'numeric', minute: 'numeric' }) 
                                          : new Date(request.createdAt).toLocaleDateString('en-GB', { hour: 'numeric', minute: 'numeric' })}
                                      </p>
                                    </div>
                                    <div className="col-span-2">
                                      <Label>Project</Label>
                                      <p className="font-medium">{request.project ? getProjectName(request.project) : 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <Label>Purpose</Label>
                                      <p className="font-medium">{request.purpose}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700 cursor-pointer"
                              onClick={() => onApproveRequest(request.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 cursor-pointer"
                              onClick={() => openRejectDialog('request', request.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Requests Pagination */}
                {totalRequestsPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {requestsPage} of {totalRequestsPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRequestsPage(prev => Math.max(prev - 1, 1))}
                        disabled={requestsPage === 1}
                        className="cursor-pointer"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRequestsPage(prev => Math.min(prev + 1, totalRequestsPages))}
                        disabled={requestsPage === totalRequestsPages}
                        className="cursor-pointer"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Liquidations */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Liquidations</CardTitle>
              <CardDescription>
                {pendingLiquidations.length} liquidations (pending and rejected)
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="cursor-pointer">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {pendingLiquidations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No liquidations</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Receipts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidationsToDisplay.map((liquidation: Liquidation) => (
                      <TableRow key={liquidation.id}>
                        <TableCell className="font-medium">{formatLiquidationId(liquidation.id)}</TableCell>
                        <TableCell>{formatRequestId(liquidation.requestId)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{liquidation.requesterName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {liquidation.requesterRole}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>K{liquidation.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span className="text-muted-foreground">{liquidation.receipts.length} receipt(s)</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={liquidation.status === 'approved' ? 'default' : 
                                    liquidation.status === 'rejected' ? 'destructive' : 
                                    'secondary'}
                          >
                            {liquidation.status.split('-').map((word: string) => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className='cursor-pointer'>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Liquidation Details</DialogTitle>
                                  <DialogDescription>Liquidation ID: {formatLiquidationId(liquidation.id)}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Requester</Label>
                                      <p className="font-medium">{liquidation.requesterName}</p>
                                    </div>
                                    <div>
                                      <Label>Role</Label>
                                      <p className="font-medium">{liquidation.requesterRole}</p>
                                    </div>
                                    <div>
                                      <Label>Request ID</Label>
                                      <p className="font-medium">{formatRequestId(liquidation.requestId)}</p>
                                    </div>
                                    <div>
                                      <Label>Total Amount</Label>
                                      <p className="font-medium">K{liquidation.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <Badge 
                                        variant={liquidation.status === 'approved' ? 'default' : 
                                                liquidation.status === 'rejected' ? 'destructive' : 
                                                'secondary'}
                                      >
                                        {liquidation.status.split('-').map((word: string) => 
                                          word.charAt(0).toUpperCase() + word.slice(1)
                                        ).join(' ')}
                                      </Badge>
                                    </div>
                                    
                                    {/* Display rejection reason if available */}
                                    {liquidation.status === 'rejected' && liquidation.rejectionReason && (
                                      <div className="col-span-2">
                                        <Label className="text-red-600">Rejection Reason</Label>
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                          <p className="text-red-800 font-medium">
                                            {liquidation.rejectionReason}
                                          </p>                              
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Display approved/rejected by and dates if available */}
                                    {liquidation.approvedBy && (
                                      <div>
                                        <Label>Processed By</Label>
                                        <p className="font-medium">{liquidation.approvedBy}</p>
                                      </div>
                                    )}
                                    {liquidation.approvedAt && (
                                      <div>
                                        <Label>Processed At</Label>
                                        <p className="font-medium">
                                          {liquidation.approvedAt instanceof Date 
                                            ? liquidation.approvedAt.toLocaleString('en-GB') 
                                            : new Date(liquidation.approvedAt).toLocaleString('en-GB')}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Display created and updated dates */}
                                    <div>
                                      <Label>Submitted At</Label>
                                      <p className="font-medium">
                                        {liquidation.createdAt instanceof Date 
                                          ? liquidation.createdAt.toLocaleString('en-GB') 
                                          : new Date(liquidation.createdAt).toLocaleString('en-GB')}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Last Updated</Label>
                                      <p className="font-medium">
                                        {liquidation.updatedAt instanceof Date 
                                          ? liquidation.updatedAt.toLocaleString('en-GB') 
                                          : new Date(liquidation.updatedAt).toLocaleString('en-GB')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Receipts</Label>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Name</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Description</TableHead>
                                          <TableHead>File</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {liquidation.receipts.map((receipt: Receipt, index: number) => (
                                          <TableRow key={`${liquidation.id}-${index}`}>
                                            <TableCell>{receipt.name}</TableCell>
                                            <TableCell>K{receipt.amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                              {receipt.date instanceof Date 
                                                ? receipt.date.toLocaleDateString('en-GB') 
                                                : new Date(receipt.date).toLocaleDateString('en-GB')}
                                            </TableCell>
                                            <TableCell>{receipt.description}</TableCell>
                                            <TableCell>
                                              {receipt.fileUrl && typeof receipt.fileUrl === 'string' && receipt.fileUrl.trim() !== '' ? (
                                                <div className="flex items-center space-x-2">
                                                  <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className='cursor-pointer'
                                                    onClick={() => handleViewReceipt(receipt.fileUrl, receipt.name)}
                                                  >
                                                    {receipt.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                      <ImageIcon className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                      <FileText className="w-4 h-4 text-blue-600" />
                                                    )}
                                                  </Button>
                                                  <a 
                                                    href={encodeUrlPath(toAbsoluteUrl(receipt.fileUrl))} 
                                                    download={receipt.name}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="cursor-pointer"
                                                  >
                                                    <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                                  </a>
                                                </div>
                                              ) : (
                                                <span className="text-muted-foreground text-sm">No file</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {/* Only show approve/reject buttons if liquidation is not already approved or rejected */}
                            {(liquidation.status === 'submitted' || liquidation.status === 'under-review') && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-green-600 hover:text-green-700 cursor-pointer"
                                  onClick={() => onApproveLiquidation(liquidation.id)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700 cursor-pointer"
                                  onClick={() => openRejectDialog('liquidation', liquidation.id)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Liquidations Pagination */}
                {totalLiquidationsPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {liquidationsPage} of {totalLiquidationsPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLiquidationsPage(prev => Math.max(prev - 1, 1))}
                        disabled={liquidationsPage === 1}
                        className="cursor-pointer"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLiquidationsPage(prev => Math.min(prev + 1, totalLiquidationsPages))}
                        disabled={liquidationsPage === totalLiquidationsPages}
                        className="cursor-pointer"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reject {rejectType === 'request' ? 'Request' : 'Liquidation'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this {rejectType}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              className="cursor-pointer"
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Viewer */}
      {viewingReceipt && (
        <ReceiptViewer
          fileUrl={viewingReceipt.fileUrl}
          fileName={viewingReceipt.fileName}
          fileType={viewingReceipt.fileType}
          isOpen={viewingReceipt.isOpen}
          onClose={closeReceiptViewer}
        />
      )}
    </div>
  )
}