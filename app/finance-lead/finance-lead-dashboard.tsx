'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Eye, CheckCircle, Clock, AlertTriangle, FileText, XCircle, Download, Image as ImageIcon, Edit } from 'lucide-react'
import { RequestForm } from '@/app/finance/components/request-form'
import { LiquidationForm } from '@/app/finance/components/liquidation-form'
import { ApprovalPanel } from '@/app/finance/components/approval-panel'
import { FinanceRequest, Liquidation, Receipt } from '@/app/finance/components/finance-types'
import { formatRequestId, formatLiquidationId } from '@/app/finance/components/finance-utils'
import { toast } from 'sonner'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ReceiptViewer } from '@/app/finance/components/receipt-viewer'
import { toAbsoluteUrl, encodeUrlPath } from '@/lib/url-utils'
import { uploadFile } from '@/lib/file-upload'

interface Department {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

export function FinanceLeadDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showLiquidationForm, setShowLiquidationForm] = useState(false)
  const [showEditLiquidationForm, setShowEditLiquidationForm] = useState(false)
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null)
  const [requests, setRequests] = useState<FinanceRequest[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [allRequests, setAllRequests] = useState<FinanceRequest[]>([])
  const [allLiquidations, setAllLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)
  // Pagination states
  const [requestsPage, setRequestsPage] = useState(1)
  const [liquidationsPage, setLiquidationsPage] = useState(1)
  const itemsPerPage = 5
  // Pagination states for history tab
  const [historyPage, setHistoryPage] = useState(1)
  const historyItemsPerPage = 10
  // Date filter states
  const [historyFromDate, setHistoryFromDate] = useState('')
  const [historyToDate, setHistoryToDate] = useState('')
  // View dialog states
  const [viewingItem, setViewingItem] = useState<{item: FinanceRequest | Liquidation, type: 'request' | 'liquidation'} | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  // Receipt viewer state
  const [viewingReceipt, setViewingReceipt] = useState<{
    fileUrl: string
    fileName: string
    fileType: string
    isOpen: boolean
  } | null>(null)
  // Departments and projects state
  const [departments, setDepartments] = useState<Department[]>([])
  const [projects, setProjects] = useState<Project[]>([])

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

  // Fetch user's requests and liquidations from Firebase
  useEffect(() => {
    if (!user?.uid) return

    setLoading(true)

    // Fetch requests for the current user
    const requestsQuery = query(
      collection(db, 'financeRequests'),
      where('requesterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate() || undefined
        } as FinanceRequest
      })
      setRequests(requestsData)
    })

    // Fetch liquidations for the current user
    const liquidationsQuery = query(
      collection(db, 'liquidations'),
      where('requesterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const liquidationsUnsubscribe = onSnapshot(liquidationsQuery, (snapshot) => {
      const liquidationsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          receipts: data.receipts?.map((receipt: any) => ({
            ...receipt,
            date: receipt.date?.toDate() || new Date()
          })) || []
        } as Liquidation
      })
      setLiquidations(liquidationsData)
    })

    // Fetch all requests (for approval view)
    const allRequestsQuery = query(
      collection(db, 'financeRequests'),
      orderBy('createdAt', 'desc')
    )

    const allRequestsUnsubscribe = onSnapshot(allRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate() || undefined
        } as FinanceRequest
      })
      setAllRequests(requestsData)
    })

    // Fetch all liquidations (for approval view)
    const allLiquidationsQuery = query(
      collection(db, 'liquidations'),
      orderBy('createdAt', 'desc')
    )

    const allLiquidationsUnsubscribe = onSnapshot(allLiquidationsQuery, (snapshot) => {
      const liquidationsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          receipts: data.receipts?.map((receipt: any) => ({
            ...receipt,
            date: receipt.date?.toDate() || new Date(),
            // Ensure fileUrl property exists even if undefined
            fileUrl: receipt.fileUrl || undefined
          })) || []
        } as Liquidation
      })
      setAllLiquidations(liquidationsData)
      setLoading(false)
    })

    // Cleanup subscriptions
    return () => {
      requestsUnsubscribe()
      liquidationsUnsubscribe()
      allRequestsUnsubscribe()
      allLiquidationsUnsubscribe()
    }
  }, [user?.uid])

  // Check if user has approved requests that haven't been liquidated
  const hasUnliquidatedApprovedRequests = () => {
    return requests.some(request => 
      request.status === 'approved' && 
      !liquidations.some(liquidation => 
        liquidation.requestId === request.id && 
        (liquidation.status === 'submitted' || liquidation.status === 'approved')
      )
    )
  }

  const handleCreateRequestClick = () => {
    if (hasUnliquidatedApprovedRequests()) {
      setShowRestrictionDialog(true)
    } else {
      setShowRequestForm(true)
    }
  }

  const handleCreateRequest = async (request: Omit<FinanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      await addDoc(collection(db, 'financeRequests'), {
        ...request,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      setShowRequestForm(false)
      toast.success('Request submitted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error creating request:', error)
      toast.error('Failed to submit request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleCreateLiquidation = async (receipts: Receipt[]) => {
    try {
      const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
      
      await addDoc(collection(db, 'liquidations'), {
        requestId: selectedRequestId,
        requesterId: user?.uid || '',
        requesterName: user?.displayName || 'Unknown User',
        requesterRole: user?.role || 'unknown',
        amount: totalAmount,
        currency: 'MWK',
        purpose: requests.find(r => r.id === selectedRequestId)?.purpose || '',
        receipts: receipts.map(receipt => {
          // Create a clean receipt object for Firestore
          const cleanReceipt: any = {
            id: receipt.id,
            name: receipt.name,
            amount: receipt.amount,
            date: Timestamp.fromDate(receipt.date),
            description: receipt.description
          };
          
          // Only add fileUrl if it exists
          if (receipt.fileUrl) {
            cleanReceipt.fileUrl = receipt.fileUrl;
          }
          
          return cleanReceipt;
        }),
        status: 'submitted',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        submittedAt: Timestamp.now()
      })

      setShowLiquidationForm(false)
      setSelectedRequestId('')
      toast.success('Liquidation submitted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error creating liquidation:', error)
      toast.error('Failed to submit liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleEditLiquidation = async (receipts: Receipt[]) => {
    if (!selectedLiquidation) return;
    
    console.log('handleEditLiquidation called with receipts:', receipts);
    
    try {
      const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
      
      console.log('Updating liquidation with receipts:', receipts.map(r => ({
        id: r.id,
        name: r.name,
        fileUrl: r.fileUrl
      })));
      
      // Prepare update data
      const updateData: any = {
        amount: totalAmount,
        receipts: receipts.map(receipt => {
          // Create a clean receipt object for Firestore
          const cleanReceipt: any = {
            id: receipt.id,
            name: receipt.name,
            amount: receipt.amount,
            date: Timestamp.fromDate(receipt.date),
            description: receipt.description
          };
          
          // Only add fileUrl if it exists
          if (receipt.fileUrl) {
            cleanReceipt.fileUrl = receipt.fileUrl;
          }
          
          return cleanReceipt;
        }),
        updatedAt: Timestamp.now()
      };
      
      // If the liquidation was rejected, change status to submitted when resubmitting
      if (selectedLiquidation.status === 'rejected') {
        updateData.status = 'submitted';
        updateData.submittedAt = Timestamp.now();
      }
      
      await updateDoc(doc(db, 'liquidations', selectedLiquidation.id), updateData);

      setShowEditLiquidationForm(false)
      setSelectedLiquidation(null)
      toast.success('Liquidation updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error updating liquidation:', error)
      toast.error('Failed to update liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Approval functions for executive director view
  const handleApproveRequest = async (requestId: string) => {
    // Check if the finance lead is trying to approve their own request
    const request = allRequests.find(r => r.id === requestId)
    if (request && request.requesterId === user?.uid) {
      toast.error('You cannot approve your own requests. Only the Executive Director can approve your requests.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const requestRef = doc(db, 'financeRequests', requestId)
      await updateDoc(requestRef, {
        status: 'approved',
        approvedBy: user?.displayName || 'Finance Lead',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Request approved successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error approving request:', error)
      toast.error('Failed to approve request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    // Check if the finance lead is trying to reject their own request
    const request = allRequests.find(r => r.id === requestId)
    if (request && request.requesterId === user?.uid) {
      toast.error('You cannot reject your own requests. Only the Executive Director can handle your requests.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const requestRef = doc(db, 'financeRequests', requestId)
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      })
      toast.success('Request rejected', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Failed to reject request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleApproveLiquidation = async (liquidationId: string) => {
    // Check if the finance lead is trying to approve their own liquidation
    const liquidation = allLiquidations.find(l => l.id === liquidationId)
    if (liquidation && liquidation.requesterId === user?.uid) {
      toast.error('You cannot approve your own liquidations. Only the Executive Director can approve your liquidations.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const liquidationRef = doc(db, 'liquidations', liquidationId)
      await updateDoc(liquidationRef, {
        status: 'approved',
        approvedBy: user?.displayName || 'Finance Lead',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Liquidation approved successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error approving liquidation:', error)
      toast.error('Failed to approve liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleRejectLiquidation = async (liquidationId: string, reason: string) => {
    // Check if the finance lead is trying to reject their own liquidation
    const liquidation = allLiquidations.find(l => l.id === liquidationId)
    if (liquidation && liquidation.requesterId === user?.uid) {
      toast.error('You cannot reject your own liquidations. Only the Executive Director can handle your liquidations.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const liquidationRef = doc(db, 'liquidations', liquidationId)
      await updateDoc(liquidationRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: Timestamp.now()
      })
      toast.success('Liquidation rejected', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error rejecting liquidation:', error)
      toast.error('Failed to reject liquidation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const pendingLiquidations = liquidations.filter(l => l.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved' && 
    !liquidations.some(l => l.requestId === r.id && l.status !== 'pending'))

  // Calculate pending approvals excluding finance lead's own requests
  // This count is shown in the approvals tab to indicate how many items need review
  const pendingCount = allRequests.filter(r => 
    r.status === 'pending' && r.requesterId !== user?.uid
  ).length + allLiquidations.filter(l => 
    (l.status === 'submitted' || l.status === 'under-review') && l.requesterId !== user?.uid
  ).length

  const handleViewDetails = (item: FinanceRequest | Liquidation, type: 'request' | 'liquidation') => {
    setViewingItem({item, type})
    setIsViewDialogOpen(true)
  }

  const handleViewReceipt = (fileUrl: string | undefined, fileName: string = 'receipt') => {
    if (!fileUrl || fileUrl.trim() === '') {
      toast.error('No receipt file available', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    // Ensure we have a valid URL
    let validFileUrl = fileUrl.trim()
    
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

  const handleResetFilters = () => {
    setHistoryFromDate('')
    setHistoryToDate('')
    setHistoryPage(1)
  }

  // CSV Export function for history
  const exportHistoryToCSV = () => {
    // Combine requests and liquidations for history
    const allHistory = [
      ...allRequests
        .filter(r => r.status !== 'pending' && r.requesterId !== user?.uid)
        .map(item => ({ ...item, type: 'Request' })),
      ...allLiquidations
        .filter(l => l.status !== 'pending' && l.status !== 'submitted' && l.requesterId !== user?.uid)
        .map(item => ({ ...item, type: 'Liquidation' }))
    ];

    // Apply date filters
    const filteredHistory = allHistory.filter(item => {
      // Get the relevant date for filtering
      let itemDate: Date | undefined;
      
      if (item.type === 'Request') {
        const request = item as FinanceRequest;
        itemDate = request.approvedAt || request.updatedAt || request.createdAt;
      } else {
        const liquidation = item as Liquidation;
        itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
      }
      
      // If no date available, exclude from results
      if (!itemDate) return false;
      
      const date = new Date(itemDate);
      
      // Apply from date filter
      if (historyFromDate && date < new Date(historyFromDate)) return false;
      
      // Apply to date filter (end of day)
      if (historyToDate) {
        const toDate = new Date(historyToDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of the day
        if (date > toDate) return false;
      }
      
      return true;
    });

    // Format data for CSV export
    const exportData = filteredHistory.map(item => ({
      type: item.type,
      id: item.type === 'Request' ? formatRequestId(item.id) : formatLiquidationId(item.id),
      requester: item.requesterName,
      role: item.requesterRole,
      amount: item.amount,
      currency: item.currency || 'MWK',
      purpose: item.purpose,
      status: item.status,
      createdAt: item.createdAt instanceof Date 
        ? item.createdAt.toLocaleDateString('en-GB') 
        : new Date(item.createdAt).toLocaleDateString('en-GB'),
      updatedAt: item.updatedAt instanceof Date 
        ? item.updatedAt.toLocaleDateString('en-GB') 
        : new Date(item.updatedAt).toLocaleDateString('en-GB'),
      approvedAt: item.approvedAt ? (
        item.approvedAt instanceof Date 
          ? item.approvedAt.toLocaleDateString('en-GB') 
          : new Date(item.approvedAt).toLocaleDateString('en-GB')
      ) : 'N/A',
      approvedBy: item.approvedBy || 'N/A',
      rejectionReason: item.rejectionReason || 'N/A'
    }))

    // Create CSV content
    const headers = [
      'Type',
      'ID',
      'Requester',
      'Role',
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
      ...exportData.map(item => 
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
              key = header.toLowerCase().replace(/ /g, '').replace(/-/g, '');
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
    link.setAttribute('download', `approval_history_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance Management</h1>
          <p className="text-muted-foreground">Manage your financial requests and approve/review others' submissions</p>
        </div>
        {activeTab === 'dashboard' && (
          <Button 
            onClick={handleCreateRequestClick} 
            className="font-medium shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>
      
      {activeTab === 'dashboard' && pendingLiquidations.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <h3 className="font-medium text-orange-800">Pending Liquidations</h3>
              <p className="text-sm text-orange-700">
                You have {pendingLiquidations.length} pending liquidation(s). Complete these before submitting new requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Restriction Dialog */}
      <Dialog open={showRestrictionDialog} onOpenChange={setShowRestrictionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Submission Restricted</DialogTitle>
            <DialogDescription>
              You cannot submit a new fund request at this time
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              You have approved fund requests that have not yet been liquidated. 
              Please complete the liquidation process for all approved requests before submitting new requests.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Approved Requests Needing Liquidation:</h4>
              <ul className="list-disc pl-5 space-y-1">
                {requests
                  .filter(request => 
                    request.status === 'approved' && 
                    !liquidations.some(liquidation => 
                      liquidation.requestId === request.id && 
                      (liquidation.status === 'submitted' || liquidation.status === 'approved')
                    )
                  )
                  .map(request => (
                    <li key={request.id} className="text-blue-700">
                      Request ID: {formatRequestId(request.id)} - MWK{request.amount.toFixed(2)} - {request.purpose}
                    </li>
                  ))
                }
              </ul>
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="cursor-pointer" onClick={() => setShowRestrictionDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Form Modal */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Fund Request</DialogTitle>
            <DialogDescription>
              Submit a request for funding approval
            </DialogDescription>
          </DialogHeader>
          <RequestForm 
            onSubmit={handleCreateRequest} 
            onCancel={() => setShowRequestForm(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Liquidation Form Modal */}
      <Dialog open={showLiquidationForm} onOpenChange={setShowLiquidationForm}>
        <DialogContent className="min-w-[800px] max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Liquidation Form</DialogTitle>
            <DialogDescription>
              Liquidate funds for request {formatRequestId(selectedRequestId)}
            </DialogDescription>
          </DialogHeader>
          {selectedRequestId && (
            <LiquidationForm 
              requestId={selectedRequestId}
              onSubmit={handleCreateLiquidation}
              onCancel={() => {
                setShowLiquidationForm(false)
                setSelectedRequestId('')
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Liquidation Form Modal */}
      <Dialog open={showEditLiquidationForm} onOpenChange={setShowEditLiquidationForm}>
        <DialogContent className="min-w-[800px] max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Liquidation</DialogTitle>
            <DialogDescription>
              Edit liquidation {selectedLiquidation ? formatLiquidationId(selectedLiquidation.id) : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedLiquidation && (
            <LiquidationForm 
              requestId={selectedLiquidation.requestId}
              initialReceipts={selectedLiquidation.receipts}
              onSubmit={handleEditLiquidation}
              onCancel={() => {
                setShowEditLiquidationForm(false)
                setSelectedLiquidation(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 border-border cursor-pointer">
          <TabsTrigger 
            value="dashboard" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            My Financial Management
          </TabsTrigger>
          <TabsTrigger 
            value="approvals" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Approve Requests
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Approval History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 pt-4">
          {approvedRequests.length > 0 && (
            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Requests Needing Liquidation</CardTitle>
                <CardDescription>Approved requests that require liquidation</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Approved Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{formatRequestId(request.id)}</TableCell>
                        <TableCell>MWK{request.amount.toFixed(2)}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                        <TableCell>
                          {request.approvedAt?.toLocaleDateString('en-GB') || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedRequestId(request.id)
                              setShowLiquidationForm(true)
                            }}
                            className='cursor-pointer'
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Liquidate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">All Requests</CardTitle>
              <CardDescription>Your submitted fund requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Apply pagination
                    const startIndex = (requestsPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const paginatedRequests = requests.slice(startIndex, endIndex)
                    const totalPages = Math.ceil(requests.length / itemsPerPage)
                    
                    return paginatedRequests.length > 0 ? (
                      paginatedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{formatRequestId(request.id)}</TableCell>
                          <TableCell>MWK{request.amount.toFixed(2)}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={request.status === 'pending' ? 'secondary' : 
                                      request.status === 'approved' ? 'default' : 
                                      request.status === 'rejected' ? 'destructive' : 'outline'}
                            >
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className='cursor-pointer'
                              onClick={() => handleViewDetails(request, 'request')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No requests found
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
              
              {/* Pagination for requests */}
              {requests.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((requestsPage - 1) * itemsPerPage + 1, requests.length)} to {Math.min(requestsPage * itemsPerPage, requests.length)} of {requests.length} requests
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => setRequestsPage(prev => Math.max(prev - 1, 1))}
                      disabled={requestsPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground mx-2">
                        Page {requestsPage} of {Math.ceil(requests.length / itemsPerPage)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => setRequestsPage(prev => Math.min(prev + 1, Math.ceil(requests.length / itemsPerPage)))}
                      disabled={requestsPage === Math.ceil(requests.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">Submitted Liquidations</CardTitle>
              <CardDescription>Your liquidation submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Liquidation ID</TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Apply pagination
                    const startIndex = (liquidationsPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const paginatedLiquidations = liquidations.slice(startIndex, endIndex)
                    const totalPages = Math.ceil(liquidations.length / itemsPerPage)
                    
                    return paginatedLiquidations.length > 0 ? (
                      paginatedLiquidations.map((liquidation) => (
                        <TableRow key={liquidation.id}>
                          <TableCell className="font-medium">{formatLiquidationId(liquidation.id)}</TableCell>
                          <TableCell>{formatRequestId(liquidation.requestId)}</TableCell>
                          <TableCell>K{liquidation.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={liquidation.status === 'pending' ? 'secondary' : 
                                      liquidation.status === 'submitted' ? 'default' : 
                                      liquidation.status === 'approved' ? 'outline' : 
                                      liquidation.status === 'rejected' ? 'destructive' : 'secondary'}
                            >
                              {liquidation.status.split('-').map((word: string) => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                              <span className="text-muted-foreground">{liquidation.receipts.length} receipts</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className='cursor-pointer'
                                onClick={() => handleViewDetails(liquidation, 'liquidation')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {(liquidation.status === 'submitted' || liquidation.status === 'rejected') && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className='cursor-pointer'
                                  onClick={() => {
                                    setSelectedLiquidation(liquidation);
                                    setShowEditLiquidationForm(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No liquidations found
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
              
              {/* Pagination for liquidations */}
              {liquidations.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((liquidationsPage - 1) * itemsPerPage + 1, liquidations.length)} to {Math.min(liquidationsPage * itemsPerPage, liquidations.length)} of {liquidations.length} liquidations
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => setLiquidationsPage(prev => Math.max(prev - 1, 1))}
                      disabled={liquidationsPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground mx-2">
                        Page {liquidationsPage} of {Math.ceil(liquidations.length / itemsPerPage)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => setLiquidationsPage(prev => Math.min(prev + 1, Math.ceil(liquidations.length / itemsPerPage)))}
                      disabled={liquidationsPage === Math.ceil(liquidations.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4 pt-4">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg py-2 px-4">
              {pendingCount} Pending Approvals
            </Badge>
          )}
          
          <ApprovalPanel
            requests={allRequests.filter(r => r.requesterId !== user?.uid)}
            liquidations={allLiquidations.filter(l => l.requesterId !== user?.uid)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onApproveLiquidation={handleApproveLiquidation}
            onRejectLiquidation={handleRejectLiquidation}
          />
          
          {/* Self-approval restriction note */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> You cannot approve or reject your own requests or liquidations. 
              Only the Executive Director can handle your submissions.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Approval History</CardTitle>
                  <CardDescription>All approved and rejected requests from other users</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="from-date" className="text-sm font-medium">From Date</Label>
                    <div className="flex gap-2">
                      <Input
                        id="from-date"
                        type="date"
                        value={historyFromDate}
                        onChange={(e) => setHistoryFromDate(e.target.value)}
                        className="w-[180px]"
                      />
                      {historyFromDate && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResetFilters}
                          className="cursor-pointer"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="to-date" className="text-sm font-medium">To Date</Label>
                    <Input
                      id="to-date"
                      type="date"
                      value={historyToDate}
                      onChange={(e) => setHistoryToDate(e.target.value)}
                      className="w-[180px]"
                    />
                  </div>
                  <Button onClick={exportHistoryToCSV} variant="outline" size="sm" className="h-10 cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Combine requests and liquidations for pagination
                      const historyItems = [
                        ...allRequests
                          .filter(r => r.status !== 'pending' && r.requesterId !== user?.uid)
                          .map(item => ({ ...item, type: 'request' })),
                        ...allLiquidations
                          .filter(l => l.status !== 'pending' && l.status !== 'submitted' && l.requesterId !== user?.uid)
                          .map(item => ({ ...item, type: 'liquidation' }))
                      ]
                      
                      // Apply date filters
                      const filteredHistoryItems = historyItems.filter(item => {
                        // Get the relevant date for filtering
                        let itemDate: Date | undefined;
                        
                        if (item.type === 'request') {
                          const request = item as FinanceRequest;
                          itemDate = request.approvedAt || request.updatedAt || request.createdAt;
                        } else {
                          const liquidation = item as Liquidation;
                          itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
                        }
                        
                        // If no date available, exclude from results
                        if (!itemDate) return false;
                        
                        const date = new Date(itemDate);
                        
                        // Apply from date filter
                        if (historyFromDate && date < new Date(historyFromDate)) return false;
                        
                        // Apply to date filter (end of day)
                        if (historyToDate) {
                          const toDate = new Date(historyToDate);
                          toDate.setHours(23, 59, 59, 999); // Set to end of the day
                          if (date > toDate) return false;
                        }
                        
                        return true;
                      })
                      
                      // Sort by date (newest first)
                      filteredHistoryItems.sort((a, b) => {
                        const dateA = a.type === 'request' 
                          ? (a as FinanceRequest).approvedAt || (a as FinanceRequest).updatedAt 
                          : (a as Liquidation).approvedAt || (a as Liquidation).updatedAt
                        const dateB = b.type === 'request' 
                          ? (b as FinanceRequest).approvedAt || (b as FinanceRequest).updatedAt 
                          : (b as Liquidation).approvedAt || (b as Liquidation).updatedAt
                        
                        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
                      })
                      
                      // Pagination
                      const totalHistoryPages = Math.ceil(filteredHistoryItems.length / historyItemsPerPage)
                      const historyToDisplay = filteredHistoryItems.slice(
                        (historyPage - 1) * historyItemsPerPage,
                        historyPage * historyItemsPerPage
                      )
                      
                      return historyToDisplay.length > 0 ? (
                        historyToDisplay.map((item) => {
                          if (item.type === 'request') {
                            const request = item as FinanceRequest
                            return (
                              <TableRow key={`req-${request.id}`}>
                                <TableCell>Request</TableCell>
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
                                  <Badge 
                                    variant={request.status === 'approved' ? 'default' : 'destructive'}
                                  >
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(request.approvedAt || request.updatedAt || request.createdAt)?.toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  }) || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleViewDetails(request, 'request')}
                                      className='cursor-pointer'
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          } else {
                            const liquidation = item as Liquidation
                            return (
                              <TableRow key={`liq-${liquidation.id}`}>
                                <TableCell>Liquidation</TableCell>
                                <TableCell className="font-medium">{formatLiquidationId(liquidation.id)}</TableCell>
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
                                  <Badge 
                                    variant={liquidation.status === 'approved' ? 'default' : 'destructive'}
                                  >
                                    {liquidation.status.split('-').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt)?.toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  }) || 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleViewDetails(liquidation, 'liquidation')}
                                      className='cursor-pointer'
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          }
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                            No approval history found
                          </TableCell>
                        </TableRow>
                      )
                    })()}
                  </TableBody>
                </Table>
                
                {/* History Pagination */}
                {(() => {
                  // Get all history items
                  const historyItems = [
                    ...allRequests
                      .filter(r => r.status !== 'pending' && r.requesterId !== user?.uid)
                      .map(item => ({ ...item, type: 'request' })),
                    ...allLiquidations
                      .filter(l => l.status !== 'pending' && l.status !== 'submitted' && l.requesterId !== user?.uid)
                      .map(item => ({ ...item, type: 'liquidation' }))
                  ]
                  
                  // Apply date filters
                  const filteredHistoryItems = historyItems.filter(item => {
                    // Get the relevant date for filtering
                    let itemDate: Date | undefined;
                    
                    if (item.type === 'request') {
                      const request = item as FinanceRequest;
                      itemDate = request.approvedAt || request.updatedAt || request.createdAt;
                    } else {
                      const liquidation = item as Liquidation;
                      itemDate = liquidation.approvedAt || liquidation.updatedAt || liquidation.createdAt;
                    }
                    
                    // If no date available, exclude from results
                    if (!itemDate) return false;
                    
                    const date = new Date(itemDate);
                    
                    // Apply from date filter
                    if (historyFromDate && date < new Date(historyFromDate)) return false;
                    
                    // Apply to date filter (end of day)
                    if (historyToDate) {
                      const toDate = new Date(historyToDate);
                      toDate.setHours(23, 59, 59, 999); // Set to end of the day
                      if (date > toDate) return false;
                    }
                    
                    return true;
                  })
                  
                  const totalHistoryPages = Math.ceil(filteredHistoryItems.length / historyItemsPerPage)
                  
                  return totalHistoryPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {Math.min((historyPage - 1) * historyItemsPerPage + 1, filteredHistoryItems.length)} to {Math.min(historyPage * historyItemsPerPage, filteredHistoryItems.length)} of {filteredHistoryItems.length} entries
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                          disabled={historyPage === 1}
                          className="cursor-pointer"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center px-2">
                          <span className="text-sm text-muted-foreground">
                            Page {historyPage} of {totalHistoryPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalHistoryPages))}
                          disabled={historyPage === totalHistoryPages}
                          className="cursor-pointer"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingItem?.type === 'request' ? 'Request Details' : 'Liquidation Details'}
            </DialogTitle>
            <DialogDescription>
              {viewingItem?.type === 'request' 
                ? `Request ID: ${viewingItem?.item ? formatRequestId(viewingItem.item.id) : ''}` 
                : `Liquidation ID: ${viewingItem?.item ? formatLiquidationId(viewingItem.item.id) : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {viewingItem?.type === 'request' ? (
              // Request Details
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Requester</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).requesterName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Role</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).requesterRole}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Amount</Label>
                    <p className="font-medium">K{(viewingItem.item as FinanceRequest).amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Department</Label>
                    <p className="font-medium">
                      {typeof (viewingItem?.item as FinanceRequest)?.department === 'string' && (viewingItem?.item as FinanceRequest)?.department 
                        ? getDepartmentName((viewingItem?.item as FinanceRequest).department || '') 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Project</Label>
                    <p className="font-medium">
                      {((viewingItem?.item as FinanceRequest)?.project && typeof (viewingItem?.item as FinanceRequest)?.project === 'string') 
                        ? getProjectName((viewingItem?.item as FinanceRequest).project || '') 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Status</Label>
                    <Badge 
                      variant={(viewingItem.item as FinanceRequest).status === 'approved' ? 'default' : 'destructive'}
                    >
                      {(viewingItem.item as FinanceRequest).status.charAt(0).toUpperCase() + (viewingItem.item as FinanceRequest).status.slice(1)}
                    </Badge>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Purpose</Label>
                    <p className="font-medium">{(viewingItem.item as FinanceRequest).purpose}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Created At</Label>
                    <p className="font-medium">
                      {(viewingItem.item as FinanceRequest).createdAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Last Updated</Label>
                    <p className="font-medium">
                      {(viewingItem.item as FinanceRequest).updatedAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  {(viewingItem.item as FinanceRequest).approvedAt && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved At</Label>
                      <p className="font-medium">
                        {(viewingItem.item as FinanceRequest).approvedAt?.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) || 'N/A'}
                      </p>
                    </div>
                  )}
                  {(viewingItem.item as FinanceRequest).approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved By</Label>
                      <p className="font-medium">{(viewingItem.item as FinanceRequest).approvedBy}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Liquidation Details
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Requester</Label>
                    <p className="font-medium">{(viewingItem?.item as Liquidation)?.requesterName}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Role</Label>
                    <p className="font-medium">{(viewingItem?.item as Liquidation)?.requesterRole}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Request ID</Label>
                    <p className="font-medium">{formatRequestId((viewingItem?.item as Liquidation)?.requestId)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Total Amount</Label>
                    <p className="font-medium">K{(viewingItem?.item as Liquidation)?.amount.toFixed(2)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Status</Label>
                    <Badge 
                      variant={(viewingItem?.item as Liquidation)?.status === 'approved' ? 'default' : 'destructive'}
                    >
                      {(viewingItem?.item as Liquidation)?.status.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Created At</Label>
                    <p className="font-medium">
                      {(viewingItem?.item as Liquidation)?.createdAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Last Updated</Label>
                    <p className="font-medium">
                      {(viewingItem?.item as Liquidation)?.updatedAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                  {(viewingItem?.item as Liquidation)?.approvedAt && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved At</Label>
                      <p className="font-medium">
                        {(viewingItem?.item as Liquidation)?.approvedAt?.toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) || 'N/A'}
                      </p>
                    </div>
                  )}
                  {(viewingItem?.item as Liquidation)?.approvedBy && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Approved By</Label>
                      <p className="font-medium">{(viewingItem?.item as Liquidation)?.approvedBy}</p>
                    </div>
                  )}
                </div>

                {/* Receipts Section */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Receipts</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-left py-3">Name</TableHead>
                          <TableHead className="text-right py-3">Amount</TableHead>
                          <TableHead className="text-left py-3">Date</TableHead>
                          <TableHead className="text-left py-3">Description</TableHead>
                          <TableHead className="text-center py-3">File</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(viewingItem?.item as Liquidation)?.receipts?.map((receipt: Receipt, index: number) => (
                          <TableRow key={`${(viewingItem?.item as Liquidation)?.id}-${index}`} className="border-b last:border-b-0">
                            <TableCell className="py-3 font-medium">{receipt.name}</TableCell>
                            <TableCell className="py-3 text-right">K{receipt.amount.toFixed(2)}</TableCell>
                            <TableCell className="py-3">
                              {receipt.date instanceof Date 
                                ? receipt.date.toLocaleDateString('en-GB') 
                                : new Date(receipt.date).toLocaleDateString('en-GB')}
                            </TableCell>
                            <TableCell className="py-3">{receipt.description}</TableCell>
                            <TableCell className="py-3 text-center">
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
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setIsViewDialogOpen(false)} className="cursor-pointer">
                Close
              </Button>
            </div>
          </div>
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
