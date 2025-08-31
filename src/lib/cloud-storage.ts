import { Dropbox } from 'dropbox'
import { google } from 'googleapis'
import { promises as fs } from 'fs'
import path from 'path'

export interface CloudStorageConfig {
  provider: 'dropbox' | 'google-drive'
  accessToken?: string
  refreshToken?: string
  enabled: boolean
}

export class CloudStorageService {
  private static configPath = path.join(process.cwd(), 'data', 'cloud-storage-config.json')

  static async uploadToDropbox(filePath: string, fileName: string, accessToken: string): Promise<void> {
    try {
      const dbx = new Dropbox({ accessToken })
      const fileContent = await fs.readFile(filePath)
      
      await dbx.filesUpload({
        path: `/Family Wealth Tracker Backups/${fileName}`,
        contents: fileContent,
        mode: 'overwrite' as any,
        autorename: true
      })
    } catch (error) {
      throw new Error(`Dropbox upload failed: ${error}`)
    }
  }

  static async uploadToGoogleDrive(filePath: string, fileName: string, accessToken: string): Promise<void> {
    try {
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })
      
      const drive = google.drive({ version: 'v3', auth })
      const fileContent = await fs.readFile(filePath)
      
      // Check if backup folder exists, create if not
      const folderQuery = await drive.files.list({
        q: "name='Family Wealth Tracker Backups' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)'
      })
      
      let folderId = folderQuery.data.files?.[0]?.id
      
      if (!folderId) {
        const folderResponse = await drive.files.create({
          requestBody: {
            name: 'Family Wealth Tracker Backups',
            mimeType: 'application/vnd.google-apps.folder'
          }
        })
        folderId = folderResponse.data.id
      }
      
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: folderId ? [folderId] : undefined
        },
        media: {
          mimeType: 'application/octet-stream',
          body: fileContent
        }
      })
    } catch (error) {
      throw new Error(`Google Drive upload failed: ${error}`)
    }
  }

  static async getCloudConfig(): Promise<CloudStorageConfig[]> {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8')
      return JSON.parse(configContent)
    } catch {
      return []
    }
  }

  static async saveCloudConfig(configs: CloudStorageConfig[]): Promise<void> {
    const dataDir = path.dirname(this.configPath)
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2))
  }

  static async updateCloudConfig(provider: 'dropbox' | 'google-drive', config: Partial<CloudStorageConfig>): Promise<void> {
    const configs = await this.getCloudConfig()
    const existingIndex = configs.findIndex(c => c.provider === provider)
    
    const newConfig: CloudStorageConfig = {
      provider,
      enabled: false,
      ...config
    }
    
    if (existingIndex >= 0) {
      configs[existingIndex] = { ...configs[existingIndex], ...newConfig }
    } else {
      configs.push(newConfig)
    }
    
    await this.saveCloudConfig(configs)
  }

  static async uploadBackupToCloud(filePath: string, fileName: string): Promise<void> {
    const configs = await this.getCloudConfig()
    const enabledConfigs = configs.filter(config => config.enabled && config.accessToken)
    
    const uploadPromises = enabledConfigs.map(async (config) => {
      try {
        if (config.provider === 'dropbox' && config.accessToken) {
          await this.uploadToDropbox(filePath, fileName, config.accessToken)
        } else if (config.provider === 'google-drive' && config.accessToken) {
          await this.uploadToGoogleDrive(filePath, fileName, config.accessToken)
        }
      } catch (error) {
        console.error(`Failed to upload to ${config.provider}:`, error)
        // Don't throw, just log the error so other uploads can continue
      }
    })
    
    await Promise.allSettled(uploadPromises)
  }

  static generateDropboxAuthUrl(clientId: string, redirectUri: string): string {
    const dbx = new Dropbox({ clientId })
    return dbx.getAuthenticationUrl(redirectUri)
  }

  static async exchangeDropboxCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<string> {
    const dbx = new Dropbox({ clientId, clientSecret })
    
    try {
      const response = await dbx.getAccessTokenFromCode(redirectUri, code)
      return response.result.access_token as string
    } catch (error) {
      throw new Error(`Dropbox token exchange failed: ${error}`)
    }
  }

  static generateGoogleDriveAuthUrl(clientId: string, redirectUri: string): string {
    const oauth2Client = new google.auth.OAuth2(clientId, '', redirectUri)
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file']
    })
  }

  static async exchangeGoogleDriveCode(clientId: string, clientSecret: string, code: string, redirectUri: string): Promise<{ accessToken: string, refreshToken: string }> {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    
    try {
      const { tokens } = await oauth2Client.getToken(code)
      
      return {
        accessToken: tokens.access_token as string,
        refreshToken: tokens.refresh_token as string
      }
    } catch (error) {
      throw new Error(`Google Drive token exchange failed: ${error}`)
    }
  }
}