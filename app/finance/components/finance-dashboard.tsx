'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Eye, Edit, CheckCircle, Clock, AlertTriangle, FileText, Trash2, Download, ImageIcon } from 'lucide-react'
import { RequestForm } from './request-form'
import { LiquidationForm } from './liquidation-form'
import { FinanceRequest, Liquidation, Receipt } from './finance-types'
import { formatRequestId, formatLiquidationId } from './finance-utils'
import { toast } from 'sonner'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ReceiptViewer } from './receipt-viewer'
import { toAbsoluteUrl, isValidUrl, encodeUrlPath } from '@/lib/url-utils'

export function FinanceDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('requests')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showLiquidationForm, setShowLiquidationForm] = useState(false)
  const [showEditLiquidationForm, setShowEditLiquidationForm] = useState(false)
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null)
  const [requests, setRequests] = useState<FinanceRequest[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)
  // Pagination and filtering state for liquidations tab
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  // Pagination and filtering state for requests tab
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1)
  const [requestsStatusFilter, setRequestsStatusFilter] = useState<string>('all')
  // Date filtering state for history tab
  const [historyFromDate, setHistoryFromDate] = useState<string>('')
  const [historyToDate, setHistoryToDate] = useState<string>('')
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1)
  const [viewingReceipt, setViewingReceipt] = useState<{
    fileUrl: string
    fileName: string
    fileType: string
    isOpen: boolean
  } | null>(null)
  const [viewingRequest, setViewingRequest] = useState<FinanceRequest | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Fetch requests and liquidations from Firebase
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
        console.log('Processing liquidation document:', doc.id, data);
        
        const processedLiquidation = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          submittedAt: data.submittedAt?.toDate() || undefined,
          approvedAt: data.approvedAt?.toDate() || undefined,
          receipts: data.receipts?.map((receipt: any) => {
            console.log('Processing receipt:', receipt);
            return {
              ...receipt,
              date: receipt.date?.toDate() || new Date(),
              // Ensure fileUrl property exists even if undefined
              fileUrl: receipt.fileUrl || undefined
            }
          }) || []
        } as Liquidation;
        
        console.log('Processed liquidation:', processedLiquidation);
        return processedLiquidation;
      })
      setLiquidations(liquidationsData)
      setLoading(false)
    })

    // Cleanup subscriptions
    return () => {
      requestsUnsubscribe()
      liquidationsUnsubscribe()
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

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setRequestsCurrentPage(1);
    setHistoryCurrentPage(1);
  }, [activeTab]);

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

  const handleCancelRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'financeRequests', requestId), {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      })

      toast.success('Request cancelled successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error) {
      console.error('Error cancelling request:', error)
      toast.error('Failed to cancel request', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleViewDetails = (request: FinanceRequest) => {
    setViewingRequest(request)
    setIsViewDialogOpen(true)
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

  // CSV Export function for history
  const exportHistoryToCSV = () => {
    // Combine requests and liquidations for history
    const allHistory = [
      ...requests.map(request => ({ ...request, type: 'Request' })),
      ...liquidations.map(liquidation => ({ ...liquidation, type: 'Liquidation' }))
    ];

    // Apply date filter
    const filteredHistory = allHistory.filter(item => {
      const itemDate = item.createdAt instanceof Date 
        ? item.createdAt 
        : new Date(item.createdAt);
      
      const fromDate = historyFromDate ? new Date(historyFromDate) : null;
      const toDate = historyToDate ? new Date(historyToDate) : null;
      
      if (fromDate && itemDate < fromDate) return false;
      if (toDate && itemDate > toDate) return false;
      
      return true;
    });

    // Sort by date descending
    filteredHistory.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Format data for CSV export
    const exportData = filteredHistory.map(item => ({
      type: item.type,
      id: item.type === 'Request' ? formatRequestId(item.id) : formatLiquidationId(item.id),
      requester: item.requesterName,
      role: item.requesterRole,
      amount: item.amount,
      currency: item.currency,
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
              key = header.toLowerCase().replace(/ /g, '').replace(/-/g, '')
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
    link.setAttribute('download', `financial_history_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const pendingLiquidations = liquidations.filter(l => l.status === 'pending')
  const approvedRequests = requests.filter(r => r.status === 'approved' && 
    !liquidations.some(l => l.requestId === r.id && l.status !== 'pending'))

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
          <h1 className="text-3xl font-bold text-foreground">Financial Management</h1>
          <p className="text-muted-foreground">Manage fund requests and liquidations</p>
        </div>
        {activeTab === 'requests' && (
          <Button 
            onClick={handleCreateRequestClick} 
            className="font-medium shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {pendingLiquidations.length > 0 && (
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/20 border-border cursor-pointer">
          <TabsTrigger 
            value="requests" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Requests
          </TabsTrigger>
          <TabsTrigger 
            value="liquidations" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            Liquidations
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 pt-4">
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">All Requests</CardTitle>
                  <CardDescription>Your submitted fund requests</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={requestsStatusFilter} onValueChange={setRequestsStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtered and paginated requests */}
              {(() => {
                // Apply status filter
                const filteredRequests = requestsStatusFilter === 'all' 
                  ? requests 
                  : requests.filter(r => r.status === requestsStatusFilter);
                
                // Apply pagination
                const startIndex = (requestsCurrentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
                const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
                
                return (
                  <>
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
                        {paginatedRequests.length > 0 ? (
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
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className='cursor-pointer'
                                    onClick={() => handleViewDetails(request)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {request.status === 'pending' ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className='cursor-pointer text-destructive hover:text-destructive'
                                        onClick={() => handleCancelRequest(request.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <div className="w-8 h-8" /> // Empty div to maintain spacing
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No requests found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {filteredRequests.length > 0 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setRequestsCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={requestsCurrentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mx-2">
                              Page {requestsCurrentPage} of {totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setRequestsCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={requestsCurrentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liquidations" className="space-y-4 pt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Submitted Liquidations</CardTitle>
                  <CardDescription>Your liquidation submissions</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtered and paginated liquidations */}
              {(() => {
                // Apply status filter
                const filteredLiquidations = statusFilter === 'all' 
                  ? liquidations 
                  : liquidations.filter(l => l.status === statusFilter);
                
                // Apply pagination
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedLiquidations = filteredLiquidations.slice(startIndex, endIndex);
                const totalPages = Math.ceil(filteredLiquidations.length / itemsPerPage);
                
                return (
                  <>
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
                        {paginatedLiquidations.length > 0 ? (
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
                                  <span className="text-muted-foreground">{liquidation.receipts.length} receipt(s)</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className='cursor-pointer'
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                                              variant={liquidation.status === 'pending' ? 'secondary' : 
                                                      liquidation.status === 'submitted' ? 'default' : 
                                                      liquidation.status === 'approved' ? 'outline' : 
                                                      liquidation.status === 'rejected' ? 'destructive' : 'secondary'}
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
                                              {liquidation.receipts.map((receipt, index) => (
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
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {filteredLiquidations.length > 0 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredLiquidations.length)} of {filteredLiquidations.length} liquidations
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mx-2">
                              Page {currentPage} of {totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">Financial History</CardTitle>
                  <CardDescription>Complete history of your financial activities</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="from-date" className="text-sm font-medium">From Date</Label>
                    <Input
                      id="from-date"
                      type="date"
                      value={historyFromDate}
                      onChange={(e) => setHistoryFromDate(e.target.value)}
                      className="w-[180px]"
                    />
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
                  {(historyFromDate || historyToDate) && (
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 cursor-pointer"
                        onClick={() => {
                          setHistoryFromDate('');
                          setHistoryToDate('');
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                  <Button onClick={exportHistoryToCSV} variant="outline" size="sm" className="h-10 cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filtered and paginated history */}
              {(() => {
                // Combine requests and liquidations for history
                const allHistory = [
                  ...requests.map(request => ({ ...request, type: 'Request' })),
                  ...liquidations.map(liquidation => ({ ...liquidation, type: 'Liquidation' }))
                ];
                
                // Apply date filter
                const filteredHistory = allHistory.filter(item => {
                  const itemDate = item.createdAt instanceof Date 
                    ? item.createdAt 
                    : new Date(item.createdAt);
                  
                  const fromDate = historyFromDate ? new Date(historyFromDate) : null;
                  const toDate = historyToDate ? new Date(historyToDate) : null;
                  
                  if (fromDate && itemDate < fromDate) return false;
                  if (toDate && itemDate > toDate) return false;
                  
                  return true;
                });
                
                // Sort by date descending
                filteredHistory.sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                
                // Apply pagination
                const startIndex = (historyCurrentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedHistory = filteredHistory.slice(startIndex, endIndex);
                const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
                
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory.length > 0 ? (
                          paginatedHistory.map((item) => (
                            <TableRow key={`${item.type.toLowerCase()}-${item.id}`}>
                              <TableCell>{item.type}</TableCell>
                              <TableCell className="font-medium">
                                {item.type === 'Request' 
                                  ? formatRequestId(item.id) 
                                  : formatLiquidationId(item.id)}
                              </TableCell>
                              <TableCell>K{item.amount.toFixed(2)}</TableCell>
                              <TableCell>
                                {item.createdAt instanceof Date 
                                  ? item.createdAt.toLocaleDateString('en-GB') 
                                  : new Date(item.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.status === 'pending' ? 'secondary' : 
                                          item.status === 'approved' || item.status === 'submitted' ? 'default' : 
                                          item.status === 'rejected' ? 'destructive' : 'outline'}
                                >
                                  {item.status.split('-').map((word: string) => 
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                  ).join(' ')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No history found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {filteredHistory.length > 0 && (
                      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredHistory.length)} of {filteredHistory.length} records
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={historyCurrentPage === 1}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mx-2">
                              Page {historyCurrentPage} of {totalPages}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className='cursor-pointer'
                            onClick={() => setHistoryCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={historyCurrentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* View Request Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Request ID: {viewingRequest ? formatRequestId(viewingRequest.id) : ''}
            </DialogDescription>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Requester</Label>
                  <p className="font-medium">{viewingRequest.requesterName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Role</Label>
                  <p className="font-medium">{viewingRequest.requesterRole}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Amount</Label>
                  <p className="font-medium">MWK{viewingRequest.amount.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Status</Label>
                  <Badge 
                    variant={viewingRequest.status === 'pending' ? 'secondary' : 
                            viewingRequest.status === 'approved' ? 'default' : 
                            viewingRequest.status === 'rejected' ? 'destructive' : 'outline'}
                  >
                    {viewingRequest.status.charAt(0).toUpperCase() + viewingRequest.status.slice(1)}
                  </Badge>
                </div>

                {/* Display rejection reason if available */}
                {viewingRequest.status === 'rejected' && viewingRequest.rejectionReason && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-semibold text-red-600">Rejection Reason</Label>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 font-medium">
                        {viewingRequest.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold">Purpose</Label>
                  <p className="font-medium">{viewingRequest.purpose}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Created At</Label>
                  <p className="font-medium">
                    {viewingRequest.createdAt?.toLocaleString('en-GB', {
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
                    {viewingRequest.updatedAt?.toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) || 'N/A'}
                  </p>
                </div>
                {viewingRequest.approvedAt && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Approved At</Label>
                    <p className="font-medium">
                      {viewingRequest.approvedAt?.toLocaleString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'N/A'}
                    </p>
                  </div>
                )}
                {viewingRequest.approvedBy && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Approved By</Label>
                    <p className="font-medium">{viewingRequest.approvedBy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsViewDialogOpen(false)} className="cursor-pointer">
              Close
            </Button>
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