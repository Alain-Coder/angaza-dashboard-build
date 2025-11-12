'use client'

import { useState, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Receipt } from './finance-types'
import { formatRequestId } from './finance-utils'
import { validateFile, uploadFile } from '@/lib/file-upload'

interface ExtendedReceipt extends Receipt {
  file?: File
  filePreview?: string
  hasFile?: boolean
}

interface LiquidationFormProps {
  requestId: string
  initialReceipts?: Receipt[]
  onSubmit: (receipts: Receipt[]) => void
  onCancel: () => void
}

export function LiquidationForm({ requestId, initialReceipts, onSubmit, onCancel }: LiquidationFormProps) {
  const [receipts, setReceipts] = useState<ExtendedReceipt[]>(initialReceipts && initialReceipts.length > 0 
    ? initialReceipts.map(receipt => ({
        ...receipt,
        id: receipt.id || Date.now().toString() + Math.random(),
        hasFile: !!receipt.fileUrl // Mark existing receipts as having files
      }))
    : [
        { 
          id: '1', 
          name: '', 
          amount: 0, 
          date: new Date(), 
          description: 'Enter description of expense',
          hasFile: false
        }
      ]
  )
  
  console.log('Initial receipts state:', receipts);

  const [loading, setLoading] = useState(false)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const addReceipt = () => {
    const newReceipt: ExtendedReceipt = {
      id: Date.now().toString(),
      name: '',
      amount: 0,
      date: new Date(),
      description: 'Enter description of expense',
      hasFile: false
    }
    setReceipts([...receipts, newReceipt])
  }

  const removeReceipt = (id: string) => {
    if (receipts.length <= 1) {
      toast.error('You must have at least one receipt', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setReceipts(receipts.filter(receipt => receipt.id !== id))
  }

  const updateReceipt = (id: string, field: keyof ExtendedReceipt, value: any) => {
    setReceipts(prevReceipts => 
      prevReceipts.map(receipt => 
        receipt.id === id ? { ...receipt, [field]: value } : receipt
      )
    )
  }

  const handleFileChange = (id: string, file: File | null) => {
    if (!file) {
      // Reset file data when file is removed
      setReceipts(prevReceipts =>
        prevReceipts.map(receipt =>
          receipt.id === id
            ? {
                ...receipt,
                file: undefined,
                filePreview: undefined,
                hasFile: false
              }
            : receipt
        )
      )
      return
    }

    // Validate file
    if (!validateFile(file)) {
      toast.error('Invalid file. Please upload a valid image (JPEG, PNG, GIF) or PDF file (max 5MB).', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    console.log('File selected for upload:', {
      id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // For non-image files, update immediately
    if (!file.type.startsWith('image/')) {
      setReceipts(prevReceipts =>
        prevReceipts.map(receipt =>
          receipt.id === id
            ? {
                ...receipt,
                file,
                filePreview: undefined,
                hasFile: true
              }
            : receipt
        )
      )
    } else {
      // For image files, create preview first
      const reader = new FileReader()
      reader.onload = (e) => {
        setReceipts(prevReceipts =>
          prevReceipts.map(receipt =>
            receipt.id === id
              ? {
                  ...receipt,
                  file,
                  filePreview: e.target?.result as string,
                  hasFile: true
                }
              : receipt
          )
        )
      }
      reader.readAsDataURL(file)
    }
    
    toast.success('File selected successfully. It will be uploaded when you submit the form.', {
      style: { backgroundColor: '#dcfce7', color: '#166534' }
    })
  }

  const setFileInputRef = (index: number) => (el: HTMLInputElement | null) => {
    fileInputRefs.current[index] = el
  }

  const triggerFileInput = (index: number) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]?.click()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    console.log('Starting submission with receipts:', receipts);

    // Basic validation - check for empty required fields
    const invalidReceipts = receipts.filter(receipt => {
      const hasEmptyFields = !receipt.name?.trim() || receipt.amount <= 0 || !receipt.description?.trim();
      const hasNoFile = !receipt.hasFile && !receipt.fileUrl;
      
      console.log('Receipt validation:', {
        id: receipt.id,
        name: receipt.name,
        amount: receipt.amount,
        description: receipt.description,
        hasFile: receipt.hasFile,
        fileUrl: receipt.fileUrl,
        hasEmptyFields,
        hasNoFile
      });
      
      return hasEmptyFields || hasNoFile;
    });

    if (invalidReceipts.length > 0) {
      console.log('Invalid receipts found:', invalidReceipts);
      toast.error(`Please fill all required fields and upload files for all receipts. ${invalidReceipts.length} receipt(s) are incomplete.`, {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      setLoading(false)
      return
    }

    // Upload files and prepare receipts for submission
    try {
      const receiptsToSubmit: Receipt[] = [];

      // Process each receipt sequentially
      for (const receipt of receipts) {
        console.log('Processing receipt:', {
          id: receipt.id,
          name: receipt.name,
          hasFile: receipt.hasFile,
          hasNewFile: !!receipt.file,
          existingFileUrl: receipt.fileUrl
        });

        let finalFileUrl = receipt.fileUrl;

        // Upload new file if present
        if (receipt.file) {
          console.log('Uploading new file for receipt:', receipt.name);
          try {
            const uploadResult = await uploadFile(receipt.file, 'finance/receipts');
            console.log('Upload result:', uploadResult);
            
            if (uploadResult && uploadResult.url) {
              finalFileUrl = uploadResult.url;
              console.log('File uploaded successfully, URL:', finalFileUrl);
            } else {
              throw new Error('Upload result missing URL');
            }
          } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            toast.error(`Failed to upload file for receipt "${receipt.name}". Please try again.`, {
              style: { backgroundColor: '#fee2e2', color: '#991b1b' }
            });
            throw new Error(`File upload failed for receipt: ${receipt.name}`);
          }
        }

        // Create clean receipt object
        const { file, filePreview, hasFile, ...cleanReceipt } = receipt;
        
        const submittedReceipt: Receipt = {
          ...cleanReceipt,
          fileUrl: finalFileUrl
        };

        console.log('Final receipt data:', submittedReceipt);
        receiptsToSubmit.push(submittedReceipt);
      }

      console.log('All receipts ready for submission:', receiptsToSubmit);
      
      // Verify all receipts have file URLs
      const receiptsWithoutFiles = receiptsToSubmit.filter(receipt => !receipt.fileUrl);
      if (receiptsWithoutFiles.length > 0) {
        console.error('Some receipts are missing file URLs:', receiptsWithoutFiles);
        throw new Error('Some receipts are missing file URLs');
      }

      onSubmit(receiptsToSubmit);
      toast.success('Liquidation submitted successfully!', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
    } catch (error) {
      console.error('Error submitting liquidation:', error);
      toast.error('Failed to submit liquidation. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold">Receipts for Request {formatRequestId(requestId)}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add all receipts for this request. You must include at least one receipt.
            </p>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={addReceipt}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Receipt
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-1/4">Receipt Name</TableHead>
                <TableHead className="w-1/6">Amount (MWK)</TableHead>
                <TableHead className="w-1/6">Date</TableHead>
                <TableHead className="w-1/3">Description</TableHead>
                <TableHead className="w-1/12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt, index) => (
                <TableRow key={receipt.id} className="border-b last:border-b-0">
                  <TableCell>
                    <Input
                      placeholder="Receipt name"
                      value={receipt.name}
                      onChange={(e) => updateReceipt(receipt.id, 'name', e.target.value)}
                      required
                      className="w-full min-h-[40px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      value={receipt.amount || ''}
                      onChange={(e) => updateReceipt(receipt.id, 'amount', parseFloat(e.target.value) || 0)}
                      required
                      className="w-full min-h-[40px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={receipt.date.toISOString().split('T')[0]}
                      onChange={(e) => updateReceipt(receipt.id, 'date', new Date(e.target.value))}
                      required
                      className="w-full min-h-[40px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      placeholder="Description of expense"
                      value={receipt.description}
                      onChange={(e) => updateReceipt(receipt.id, 'description', e.target.value)}
                      required
                      className="w-full min-h-[120px]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeReceipt(receipt.id)}
                        disabled={receipts.length <= 1}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* File Upload Section Outside Table */}
        <div className="bg-muted/20 rounded-lg p-4">
          <h4 className="font-medium mb-3">Upload Receipt Files</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map((receipt, index) => (
              <div key={`upload-${receipt.id}`} className="border rounded-md p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {receipt.name || `Receipt ${index + 1}`}
                  </span>
                  {!receipt.hasFile && !receipt.fileUrl && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      File Required
                    </span>
                  )}
                </div>
                
                {/* File Preview Section */}
                {(receipt.filePreview || receipt.file || receipt.fileUrl) && (
                  <div className="flex items-center justify-center mb-3 p-2 bg-muted/30 rounded">
                    {receipt.filePreview && receipt.filePreview.startsWith('data:image') ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={receipt.filePreview} 
                          alt="Receipt preview" 
                          className="max-h-20 max-w-full object-contain rounded"
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {receipt.file ? 'New Image' : 'Existing Image'}
                        </span>
                      </div>
                    ) : receipt.file ? (
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div className="text-sm text-center mt-2">
                          <div className="font-medium">New Document</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {receipt.file.name} ({(receipt.file.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <FileText className="w-8 h-8 text-green-600" />
                        <div className="text-sm text-center mt-2">
                          <div className="font-medium">Existing File</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {receipt.fileUrl ? `File attached` : 'Document'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={setFileInputRef(index)}
                    className="hidden"
                    onChange={(e) => handleFileChange(receipt.id, e.target.files?.[0] || null)}
                    accept="image/*,application/pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => triggerFileInput(index)}
                    className="flex-1 flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {receipt.file ? 'Change File' : 
                     receipt.fileUrl ? 'Replace File' : 'Upload File'}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground text-center mt-2">
                  JPG, PNG, GIF, or PDF (max 5MB)
                </div>
                
                {receipt.hasFile || receipt.fileUrl ? (
                  <div className="mt-2 text-xs text-center text-green-600 font-medium">
                    ✓ File {receipt.file ? 'selected' : 'attached'}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-center text-red-600">
                    ⚠ File required for this receipt
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 p-6 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <p>Please ensure all receipts are accurate and complete before submitting.</p>
            <p className="mt-1">Total receipts: {receipts.length}</p>
            <p className="mt-1">Receipts with files: {receipts.filter(r => r.hasFile || r.fileUrl).length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-3xl font-bold text-primary">MWK {totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 pt-6">
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1 h-12 cursor-pointer"
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Submitting...
            </>
          ) : (
            'Submit Liquidation'
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="flex-1 h-12 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}