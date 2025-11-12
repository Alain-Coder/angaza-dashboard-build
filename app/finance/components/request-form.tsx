'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { FinanceRequest } from './finance-types'
import { collection, query, orderBy, onSnapshot, doc, getDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Project {
  id: string
  name: string
}

interface Program {
  id: string
  name: string
  projectId: string
}

interface Department {
  id: string
  name: string
  code: string
  description?: string
}

interface User {
  department?: string
  // other user properties
}

interface RequestFormProps {
  onSubmit: (request: Omit<FinanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void
  onCancel: () => void
}

export function RequestForm({ onSubmit, onCancel }: RequestFormProps) {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [projectId, setProjectId] = useState('')
  const [programId, setProgramId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([])
  const [department, setDepartment] = useState<Department | null>(null)
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null)

  // Fetch user's department and projects from Firebase
  useEffect(() => {
    if (!user?.uid) return;

    // Fetch user's department ID from their user document
    const fetchUserDepartment = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUserDepartmentId(userData.department || null);
          
          // If user has a department, fetch the department details
          if (userData.department) {
            const deptDoc = await getDoc(doc(db, 'departments', userData.department));
            if (deptDoc.exists()) {
              const deptData = deptDoc.data();
              setDepartment({
                id: deptDoc.id,
                name: deptData.name,
                code: deptData.code,
                description: deptData.description
              });
              // Set the department ID in the form state
              setDepartmentId(deptDoc.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user department:', error);
      }
    };

    // Fetch projects
    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('name')
    )

    const projectsUnsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }))
      setProjects(projectsData)
    })

    fetchUserDepartment();

    // Cleanup subscriptions
    return () => {
      projectsUnsubscribe()
    }
  }, [user?.uid])

  // Fetch programs when projectId changes
  useEffect(() => {
    if (!projectId) {
      setFilteredPrograms([])
      setProgramId('')
      return
    }

    // Fetch programs for the selected project
    const programsQuery = query(
      collection(db, 'programs'),
      where('projectId', '==', projectId),
      orderBy('name')
    )

    const programsUnsubscribe = onSnapshot(programsQuery, (snapshot) => {
      const programsData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          projectId: data.projectId
        }
      })
      setPrograms(programsData)
      setFilteredPrograms(programsData)
    })

    // Cleanup subscription
    return () => {
      programsUnsubscribe()
    }
  }, [projectId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (!amount || !purpose || !departmentId) {
      toast.error('Please fill in all required fields')
      setLoading(false)
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount')
      setLoading(false)
      return
    }

    // Create request object
    const newRequest = {
      requesterId: user?.uid || '',
      requesterName: user?.displayName || 'Unknown User',
      requesterRole: user?.role || 'unknown',
      amount: amountValue,
      currency: 'MWK',
      purpose,
      project: projectId || undefined,
      program: programId || undefined,
      department: departmentId,
    }

    onSubmit(newRequest)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose *</Label>
        <Textarea
          id="purpose"
          placeholder="Describe the purpose of this request"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project">Project (Optional)</Label>
          <Select value={projectId} onValueChange={(value) => {
            setProjectId(value)
            setProgramId('') // Reset program when project changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="program">Program (Optional)</Label>
          <Select 
            value={programId} 
            onValueChange={setProgramId}
            disabled={!projectId} // Disable if no project is selected
          >
            <SelectTrigger>
              <SelectValue placeholder={projectId ? "Select a program" : "Select a project first"} />
            </SelectTrigger>
            <SelectContent>
              {filteredPrograms.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="department">Department *</Label>
        {department ? (
          // If user has a department, show it as a read-only field
          <div className="p-2 bg-muted rounded-md">
            <span className="font-medium">{department.name}</span>
          </div>
        ) : (
          // If user doesn't have a department assigned, show a message
          <div className="p-2 bg-muted rounded-md text-muted-foreground">
            No department assigned. Please contact your administrator.
          </div>
        )}
        {/* Hidden input to store the department ID for form submission */}
        <input type="hidden" value={departmentId} readOnly />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="hover:text-foreground">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !department}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  )
}