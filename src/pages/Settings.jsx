import { useState, useEffect } from 'react'
import { Database, Plus, X, Loader2, FileText, Users, Briefcase, Building2, Check, Edit2 } from 'lucide-react'
import { 
  getSettings, updateSetting,
  adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject,
  adminGetWorkTypes, adminCreateWorkType, adminUpdateWorkType, adminDeleteWorkType
} from '../services/api'
import AdminLayout from '../components/layout/AdminLayout'

const SETTINGS_TABS = [
  { key: 'PROJECTS', label: 'Projects', description: 'Manage site projects', type: 'api',
    icon: Building2,
    fetch: adminGetProjects, 
    create: (name) => adminCreateProject({ name, type: 'RESIDENTIAL' }), 
    update: (id, name) => adminUpdateProject(id, { name }),
    remove: adminDeleteProject,
    mapItem: (i) => ({ id: i._id, name: i.name })
  },
  { key: 'DRI_OPTIONS', label: 'Engineers / Requesters (DRIs)', description: 'List of Directly Responsible Individuals', type: 'global', icon: Users },
  { key: 'WORK_TYPES', label: 'Work Types (Categories)', description: 'Manage types of work', type: 'api',
    icon: Briefcase,
    fetch: adminGetWorkTypes, 
    create: (name) => adminCreateWorkType({ name }), 
    update: (id, name) => adminUpdateWorkType(id, { name }),
    remove: adminDeleteWorkType,
    mapItem: (i) => ({ id: i._id, name: i.name })
  },
  { key: 'DRAWING_TYPES', label: 'Drawing Types', description: 'Available types of drawings', type: 'global', icon: FileText },
]

export default function Settings() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [newValues, setNewValues] = useState({})
  const [editingItem, setEditingItem] = useState(null) // { tabKey, item }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const settingsMap = {}
      
      // Fetch globals
      const res = await getSettings()
      res.data.data.forEach(s => {
        settingsMap[s.key] = s.value
      })
      
      // Fetch APIs
      await Promise.all(SETTINGS_TABS.filter(t => t.type === 'api').map(async (tab) => {
        try {
          const apiRes = await tab.fetch()
          const items = Array.isArray(apiRes.data) ? apiRes.data : apiRes.data.data
          settingsMap[tab.key] = (items || []).map(tab.mapItem)
        } catch (e) {
          settingsMap[tab.key] = []
        }
      }))

      // Initialize missing global keys
      SETTINGS_TABS.filter(t => t.type === 'global').forEach(k => {
        if (!settingsMap[k.key]) settingsMap[k.key] = []
      })
      
      setData(settingsMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (tab) => {
    const val = newValues[tab.key]
    if (!val || !val.trim()) return
    setSavingKey(tab.key)
    try {
      const isEditing = editingItem?.tabKey === tab.key;
      
      if (tab.type === 'global') {
        const currentList = data[tab.key] || []
        
        if (isEditing) {
          const oldVal = editingItem.item
          const newList = currentList.map(i => i === oldVal ? val.trim() : i)
          const uniqueList = [...new Set(newList)]
          await updateSetting(tab.key, { value: uniqueList, description: tab.description })
          setData(prev => ({ ...prev, [tab.key]: uniqueList }))
          setEditingItem(null)
        } else {
          if (currentList.includes(val.trim())) { setSavingKey(null); return; }
          const newList = [...currentList, val.trim()]
          await updateSetting(tab.key, { value: newList, description: tab.description })
          setData(prev => ({ ...prev, [tab.key]: newList }))
        }
      } else if (tab.type === 'api') {
        if (isEditing) {
          const res = await tab.update(editingItem.item.id, val.trim())
          const updatedItem = tab.mapItem(res.data.data || res.data)
          setData(prev => ({
            ...prev,
            [tab.key]: (prev[tab.key] || []).map(i => i.id === updatedItem.id ? updatedItem : i)
          }))
          setEditingItem(null)
        } else {
          const res = await tab.create(val.trim())
          const newItem = tab.mapItem(res.data.data || res.data)
          setData(prev => ({ ...prev, [tab.key]: [...(prev[tab.key] || []), newItem] }))
        }
      }
      setNewValues(prev => ({ ...prev, [tab.key]: '' }))
    } catch (err) {
      console.error(err)
    } finally {
      setSavingKey(null)
    }
  }

  const startEdit = (tab, item) => {
    setEditingItem({ tabKey: tab.key, item })
    setNewValues(prev => ({ ...prev, [tab.key]: tab.type === 'api' ? item.name : item }))
  }

  const handleRemove = async (tab, item) => {
    setSavingKey(tab.key + '_remove')
    try {
      if (tab.type === 'global') {
        const currentList = data[tab.key] || []
        const newList = currentList.filter(i => i !== item)
        await updateSetting(tab.key, { value: newList, description: tab.description })
        setData(prev => ({ ...prev, [tab.key]: newList }))
      } else if (tab.type === 'api') {
        await tab.remove(item.id)
        setData(prev => ({
          ...prev,
          [tab.key]: (prev[tab.key] || []).filter(i => i.id !== item.id)
        }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-2 py-6">
        
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-orange-500" />
            Master Data Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure global choices loaded inside dropdown filters and selectors
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SETTINGS_TABS.map((tab) => {
            const currentList = data[tab.key] || []
            const isSaving = savingKey === tab.key
            const Icon = tab.icon
            
            const isEditingTab = editingItem?.tabKey === tab.key;
            
            return (
              <div key={tab.key} className="bg-white dark:bg-[#1a1f2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <Icon className="w-4 h-4 text-orange-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">{tab.label}</h2>
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newValues[tab.key] || ''}
                    onChange={(e) => setNewValues(prev => ({ ...prev, [tab.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave(tab)}
                    placeholder={isEditingTab ? `Update ${tab.label.toLowerCase()}...` : `Add new ${tab.label.toLowerCase()}...`}
                    className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white focus:border-orange-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    onClick={() => handleSave(tab)}
                    disabled={isSaving || !newValues[tab.key]?.trim()}
                    className={`w-10 h-10 flex-shrink-0 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors ${isEditingTab ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditingTab ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                  </button>
                  {isEditingTab && (
                    <button
                      onClick={() => { setEditingItem(null); setNewValues(prev => ({ ...prev, [tab.key]: '' })) }}
                      className="w-10 h-10 flex-shrink-0 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {currentList.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No options added yet.</span>
                  ) : (
                    currentList.map((item, idx) => {
                      const isApi = tab.type === 'api'
                      const label = isApi ? item.name : item
                      return (
                        <div 
                          key={isApi ? item.id : idx} 
                          className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            editingItem?.item === item 
                            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-500/50' 
                            : 'bg-gray-100 dark:bg-[#252b3d] hover:bg-gray-200 dark:hover:bg-[#2d3448] text-gray-700 dark:text-gray-300 border-transparent dark:border-gray-700/50'
                          }`}
                        >
                          <span 
                            className="cursor-pointer hover:text-orange-500 transition-colors" 
                            onClick={() => startEdit(tab, item)}
                            title="Click to edit"
                          >
                            {label}
                          </span>
                          <button
                            onClick={() => handleRemove(tab, item)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
