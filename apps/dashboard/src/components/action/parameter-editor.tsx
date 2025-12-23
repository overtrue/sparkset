'use client';

import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type ActionInputSchema, type ParameterDefinition } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button, buttonVariants } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface ParameterEditorProps {
  value: ActionInputSchema | undefined;
  onChange: (value: ActionInputSchema | undefined) => void;
}

export function ParameterEditor({ value, onChange }: ParameterEditorProps) {
  const t = useTranslations();
  const [parameters, setParameters] = useState<ParameterDefinition[]>(value?.parameters || []);

  // 同步外部 value 的变化
  useEffect(() => {
    setParameters(value?.parameters || []);
  }, [value]);

  const updateParameters = (newParams: ParameterDefinition[]) => {
    setParameters(newParams);
    if (newParams.length === 0) {
      onChange(undefined);
    } else {
      onChange({ parameters: newParams });
    }
  };

  const addParameter = () => {
    const newParam: ParameterDefinition = {
      name: `param${parameters.length + 1}`,
      type: 'string',
      required: false,
    };
    updateParameters([...parameters, newParam]);
  };

  const removeParameter = (index: number) => {
    updateParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, updates: Partial<ParameterDefinition>) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], ...updates };
    updateParameters(newParams);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{t('Input Parameters')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addParameter}>
          <RiAddLine className="mr-2 h-4 w-4" />
          {t('Add Parameter')}
        </Button>
      </div>

      {parameters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t(
            'No parameters defined. If Action needs input parameters, click Add Parameter button.',
          )}
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full flex flex-col gap-2">
          {parameters.map((param, index) => (
            <AccordionItem key={index} value={`param-${index}`} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {param.label || param.name || t('Parameter #{index}', { index: index + 1 })}
                    </span>
                    <span className="text-xs text-muted-foreground">({param.type})</span>
                    {param.required && <span className="text-xs text-destructive">*</span>}
                  </div>
                  <div
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'h-6 w-6 p-0 cursor-pointer',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeParameter(index);
                    }}
                  >
                    <RiSubtractLine className="h-3 w-3" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`param-name-${index}`} className="text-xs">
                        {t('Parameter Name')} *
                      </Label>
                      <Input
                        id={`param-name-${index}`}
                        value={param.name}
                        onChange={(e) => updateParameter(index, { name: e.target.value })}
                        placeholder={t('e.g.: limit')}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`param-type-${index}`} className="text-xs">
                        {t('Type')} *
                      </Label>
                      <Select
                        value={param.type}
                        onValueChange={(value) =>
                          updateParameter(index, {
                            type: value as 'string' | 'number' | 'boolean',
                          })
                        }
                      >
                        <SelectTrigger id={`param-type-${index}`} className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`param-label-${index}`} className="text-xs">
                      {t('Display Label')}
                    </Label>
                    <Input
                      id={`param-label-${index}`}
                      value={param.label || ''}
                      onChange={(e) =>
                        updateParameter(index, { label: e.target.value || undefined })
                      }
                      placeholder={t('e.g.: Quantity limit (optional, defaults to parameter name)')}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`param-description-${index}`} className="text-xs">
                      {t('Description')}
                    </Label>
                    <Textarea
                      id={`param-description-${index}`}
                      value={param.description || ''}
                      onChange={(e) =>
                        updateParameter(index, { description: e.target.value || undefined })
                      }
                      placeholder={t('Parameter description (optional)')}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`param-default-${index}`} className="text-xs">
                        {t('Default Value')}
                      </Label>
                      {param.type === 'boolean' ? (
                        <Select
                          value={param.default === undefined ? '' : String(param.default)}
                          onValueChange={(value) =>
                            updateParameter(index, {
                              default: value === '' ? undefined : value === 'true',
                            })
                          }
                        >
                          <SelectTrigger id={`param-default-${index}`} className="h-8">
                            <SelectValue placeholder={t('No default value')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('No default value')}</SelectItem>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`param-default-${index}`}
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={param.default === undefined ? '' : String(param.default)}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              updateParameter(index, { default: undefined });
                            } else if (param.type === 'number') {
                              updateParameter(index, { default: Number(value) });
                            } else {
                              updateParameter(index, { default: value });
                            }
                          }}
                          placeholder={t('Default value (optional)')}
                          className="h-8"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t('Required')}</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id={`param-required-${index}`}
                          checked={param.required || false}
                          onCheckedChange={(checked) =>
                            updateParameter(index, { required: Boolean(checked) })
                          }
                        />
                        <label
                          htmlFor={`param-required-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t('This parameter is required')}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
