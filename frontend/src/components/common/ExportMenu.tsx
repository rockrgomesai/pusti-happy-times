"use client";

import React, { useMemo, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import LayersIcon from '@mui/icons-material/Layers';
import { toast } from 'react-hot-toast';
import { ExportColumn, exportToCsv, exportToPdf } from '@/lib/exportUtils';

interface ExportMenuProps<T> {
  title: string;
  fileBaseName: string;
  currentRows: T[];
  columns: ExportColumn<T>[];
  onFetchAll: () => Promise<T[]>;
  disabled?: boolean;
}

type ExportFormat = 'csv' | 'pdf';
type ExportScope = 'current' | 'all';

const formatTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function ExportMenu<T>({
  title,
  fileBaseName,
  currentRows,
  columns,
  onFetchAll,
  disabled = false,
}: ExportMenuProps<T>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const [activeAction, setActiveAction] = useState<{ scope: ExportScope; format: ExportFormat } | null>(null);

  const open = Boolean(anchorEl);

  const hasCurrentRows = useMemo(() => currentRows.length > 0, [currentRows]);

  const closeMenu = () => {
    if (!exporting) {
      setAnchorEl(null);
    }
  };

  const handleExport = async (scope: ExportScope, format: ExportFormat) => {
    if (exporting) return;

    try {
      setActiveAction({ scope, format });
      setExporting(true);

      const rows = scope === 'current' ? currentRows : await onFetchAll();

      if (!rows.length) {
        toast.error('No records available for export');
        return;
      }

      const timestamp = formatTimestamp();
      const filename = `${fileBaseName}-${scope}-${timestamp}.${format}`;

      if (format === 'csv') {
        exportToCsv(filename, columns, rows);
      } else {
        exportToPdf(filename, title, columns, rows, { titleAlign: 'center' });
      }

      toast.success(`Successfully exported ${scope === 'current' ? 'current view' : 'all records'} as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
      setActiveAction(null);
      setAnchorEl(null);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        disabled={disabled}
        sx={{ minWidth: 140 }}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => handleExport('current', 'csv')}
          disabled={exporting || disabled || !hasCurrentRows}
        >
          <ListItemIcon>
            {exporting && activeAction?.scope === 'current' && activeAction?.format === 'csv' ? (
              <CircularProgress size={18} />
            ) : (
              <><ViewAgendaIcon fontSize="small" sx={{ mr: 0.5 }} /><GridOnIcon fontSize="small" /></>
            )}
          </ListItemIcon>
          <ListItemText primary="Export Current (CSV)" secondary="Visible rows" />
        </MenuItem>
        <MenuItem
          onClick={() => handleExport('current', 'pdf')}
          disabled={exporting || disabled || !hasCurrentRows}
        >
          <ListItemIcon>
            {exporting && activeAction?.scope === 'current' && activeAction?.format === 'pdf' ? (
              <CircularProgress size={18} />
            ) : (
              <><ViewAgendaIcon fontSize="small" sx={{ mr: 0.5 }} /><PictureAsPdfIcon fontSize="small" /></>
            )}
          </ListItemIcon>
          <ListItemText primary="Export Current (PDF)" secondary="Visible rows" />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => handleExport('all', 'csv')}
          disabled={exporting || disabled}
        >
          <ListItemIcon>
            {exporting && activeAction?.scope === 'all' && activeAction?.format === 'csv' ? (
              <CircularProgress size={18} />
            ) : (
              <><LayersIcon fontSize="small" sx={{ mr: 0.5 }} /><GridOnIcon fontSize="small" /></>
            )}
          </ListItemIcon>
          <ListItemText primary="Export All (CSV)" secondary="Full dataset" />
        </MenuItem>
        <MenuItem
          onClick={() => handleExport('all', 'pdf')}
          disabled={exporting || disabled}
        >
          <ListItemIcon>
            {exporting && activeAction?.scope === 'all' && activeAction?.format === 'pdf' ? (
              <CircularProgress size={18} />
            ) : (
              <><LayersIcon fontSize="small" sx={{ mr: 0.5 }} /><PictureAsPdfIcon fontSize="small" /></>
            )}
          </ListItemIcon>
          <ListItemText primary="Export All (PDF)" secondary="Full dataset" />
        </MenuItem>
      </Menu>
    </>
  );
}

export default ExportMenu;
