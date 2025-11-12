'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, Timestamp, getCountFromServer } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface AuditLog {
  id: string
  timestamp: Timestamp
  user: string
  action: string
  resource: string
  ip: string
}

export default function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLogsCount, setTotalLogsCount] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchAuditLogs()
  }, [filter, currentPage])

  const fetchAuditLogs = async () => {
    try {
      // Create query with ordering
      let baseQuery = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'))
      
      // Apply filter if not 'all'
      if (filter !== 'all') {
        // Note: Client-side filtering is used as in the original implementation
        // In a production app, you would filter at the database level
      }
      
      // Get total count for pagination
      const countSnapshot = await getCountFromServer(baseQuery)
      setTotalLogsCount(countSnapshot.data().count)
      
      // Get all logs (in a real app, you'd use pagination at the database level)
      const querySnapshot = await getDocs(baseQuery)
      const logsData: AuditLog[] = []
      querySnapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as AuditLog)
      })
      
      // Apply client-side filtering
      const filteredLogs = filter === 'all' 
        ? logsData 
        : logsData.filter(log => log.action.toLowerCase() === filter)
      
      setLogs(filteredLogs)
    } catch (error: any) {
      console.error('Error fetching audit logs:', error)
      // Handle permission errors specifically
      if (error.code === 'permission-denied') {
        toast.error('Insufficient permissions to view audit logs')
      } else {
        toast.error('Failed to fetch audit logs')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString('en-GB')
  }

  const handleExport = () => {
    toast.info('Export functionality would be implemented in a real application')
  }

  // Pagination calculations
  const totalPages = Math.ceil(totalLogsCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLogs = logs.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Audit Logs</h3>
          <p className="text-muted-foreground">System activity and security events</p>
        </div>
        <div className="flex space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 font-medium border-border cursor-pointer">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="logout">Logouts</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleExport}
            className="font-medium border-border hover:bg-muted/50 hover:text-foreground bg-transparent cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">System Audit Logs</CardTitle>
          <CardDescription>Track all system activities and security events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs
                .map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell className="font-medium text-foreground">{log.user}</TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'Donation Received' ? "default" : "outline"} className={log.action === 'Donation Received' ? "bg-green-100 text-green-800" : ""}>
                        {log.action}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, logs.length)} of {logs.length} logs
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                
                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}