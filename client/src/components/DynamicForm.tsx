import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { FormSchema } from "@/types";

interface DynamicFormProps {
  form: UseFormReturn<any>;
  onSave: (data: any) => void;
  schema?: FormSchema;
}

export default function DynamicForm({ form, onSave, schema }: DynamicFormProps) {
  const [openSections, setOpenSections] = useState<string[]>(["dados_basicos"]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderField = (field: any) => {
    const value = form.watch(field.id);
    const error = form.formState.errors[field.id];

    switch (field.type) {
      case "text":
        return (
          <div key={field.id}>
            <Label htmlFor={field.id} className="block text-sm font-medium text-card-foreground mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              {...form.register(field.id, { 
                required: field.required ? `${field.label} é obrigatório` : false 
              })}
              placeholder={field.placeholder}
              className={error ? "border-red-500" : ""}
              data-testid={`input-${field.id}`}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{typeof error === 'string' ? error : error.message || 'Campo inválido'}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.id}>
            <Label htmlFor={field.id} className="block text-sm font-medium text-card-foreground mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              {...form.register(field.id, { 
                required: field.required ? `${field.label} é obrigatório` : false,
                min: field.min,
                max: field.max,
                valueAsNumber: true
              })}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              className={error ? "border-red-500" : ""}
              data-testid={`input-${field.id}`}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{typeof error === 'string' ? error : error.message || 'Campo inválido'}</p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.id}>
            <Label htmlFor={field.id} className="block text-sm font-medium text-card-foreground mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value || ""}
              onValueChange={(selectedValue) => form.setValue(field.id, selectedValue)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""} data-testid={`select-${field.id}`}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-red-500 text-xs mt-1">{typeof error === 'string' ? error : error.message || 'Campo inválido'}</p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => form.setValue(field.id, checked)}
              data-testid={`checkbox-${field.id}`}
            />
            <Label htmlFor={field.id} className="text-sm">
              {field.label}
            </Label>
          </div>
        );

      case "textarea":
        return (
          <div key={field.id}>
            <Label htmlFor={field.id} className="block text-sm font-medium text-card-foreground mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              {...form.register(field.id, { 
                required: field.required ? `${field.label} é obrigatório` : false 
              })}
              placeholder={field.placeholder}
              className={error ? "border-red-500" : ""}
              data-testid={`textarea-${field.id}`}
            />
            {error && (
              <p className="text-red-500 text-xs mt-1">{typeof error === 'string' ? error : error.message || 'Campo inválido'}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Default sections if no schema provided
  const defaultSections = [
    {
      id: "dados_basicos",
      title: "Dados Básicos",
      fields: [
        {
          id: "inscricaoImobiliaria",
          type: "text",
          label: "Inscrição Imobiliária",
          required: true,
          placeholder: "12.345.678-9"
        },
        {
          id: "numero",
          type: "text",
          label: "Número",
          placeholder: "456"
        },
        {
          id: "complemento",
          type: "text",
          label: "Complemento",
          placeholder: "Apto 101"
        },
        {
          id: "usoPredominante",
          type: "select",
          label: "Uso Predominante",
          required: true,
          options: ["Residencial", "Comercial", "Misto", "Industrial", "Institucional"]
        }
      ]
    },
    {
      id: "caracteristicas",
      title: "Características do Imóvel",
      fields: [
        {
          id: "areaTerreno",
          type: "number",
          label: "Área do Terreno (m²)",
          min: 0,
          placeholder: "250.00"
        },
        {
          id: "areaConstruida",
          type: "number",
          label: "Área Construída (m²)",
          min: 0,
          placeholder: "180.00"
        },
        {
          id: "numeroPavimentos",
          type: "select",
          label: "Número de Pavimentos",
          options: ["1", "2", "3", "4+"]
        },
        {
          id: "padraoConstrutivo",
          type: "select",
          label: "Padrão Construtivo",
          options: ["Baixo", "Médio", "Alto", "Luxo"]
        },
        {
          id: "anoConstrucao",
          type: "number",
          label: "Ano de Construção Estimado",
          min: 1800,
          max: new Date().getFullYear(),
          placeholder: "1998"
        }
      ]
    },
    {
      id: "servicos",
      title: "Serviços Públicos",
      fields: [
        { id: "agua", type: "checkbox", label: "Água" },
        { id: "esgoto", type: "checkbox", label: "Esgoto" },
        { id: "energia", type: "checkbox", label: "Energia" },
        { id: "iluminacaoPublica", type: "checkbox", label: "Iluminação Pública" },
        { id: "coletaLixo", type: "checkbox", label: "Coleta de Lixo" },
        { id: "meioFio", type: "checkbox", label: "Meio-fio" }
      ]
    },
    {
      id: "proprietario",
      title: "Proprietário/Ocupante",
      fields: [
        {
          id: "proprietarioNome",
          type: "text",
          label: "Nome Completo",
          placeholder: "João da Silva"
        },
        {
          id: "proprietarioCpfCnpj",
          type: "text",
          label: "CPF/CNPJ",
          placeholder: "123.456.789-00"
        },
        {
          id: "telefone",
          type: "text",
          label: "Telefone",
          placeholder: "(11) 99999-9999"
        }
      ]
    }
  ];

  const sections = schema?.sections || defaultSections;

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.id}>
          <Collapsible
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full p-4 flex items-center justify-between text-left"
                data-testid={`section-toggle-${section.id}`}
              >
                <h2 className="font-medium text-card-foreground">{section.title}</h2>
                {openSections.includes(section.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4 space-y-4">
                {section.fields.map((field) => {
                  // Handle service checkboxes in a grid
                  if (section.id === "servicos" && field.type === "checkbox") {
                    return (
                      <div key={field.id} className="grid grid-cols-2 gap-4">
                        {section.fields.map((serviceField) => (
                          <div key={serviceField.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={serviceField.id}
                              checked={form.watch(serviceField.id) || false}
                              onCheckedChange={(checked) => form.setValue(serviceField.id, checked)}
                              data-testid={`checkbox-${serviceField.id}`}
                            />
                            <Label htmlFor={serviceField.id} className="text-sm">
                              {serviceField.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    );
                  } else if (section.id === "servicos") {
                    return null; // Skip individual service fields since they're handled above
                  }

                  // Handle characteristics in a grid
                  if (section.id === "caracteristicas" && 
                      (field.id === "areaTerreno" || field.id === "areaConstruida")) {
                    const areaTerreno = section.fields.find(f => f.id === "areaTerreno");
                    const areaConstruida = section.fields.find(f => f.id === "areaConstruida");
                    
                    if (field.id === "areaTerreno") {
                      return (
                        <div key="area-fields" className="grid grid-cols-2 gap-4">
                          {areaTerreno && renderField(areaTerreno)}
                          {areaConstruida && renderField(areaConstruida)}
                        </div>
                      );
                    } else {
                      return null; // Skip areaConstruida since it's handled above
                    }
                  }

                  if (section.id === "caracteristicas" && 
                      (field.id === "numeroPavimentos" || field.id === "padraoConstrutivo")) {
                    const numeroPavimentos = section.fields.find(f => f.id === "numeroPavimentos");
                    const padraoConstrutivo = section.fields.find(f => f.id === "padraoConstrutivo");
                    
                    if (field.id === "numeroPavimentos") {
                      return (
                        <div key="construction-fields" className="grid grid-cols-2 gap-4">
                          {numeroPavimentos && renderField(numeroPavimentos)}
                          {padraoConstrutivo && renderField(padraoConstrutivo)}
                        </div>
                      );
                    } else {
                      return null; // Skip padraoConstrutivo since it's handled above
                    }
                  }

                  return renderField(field);
                })}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
