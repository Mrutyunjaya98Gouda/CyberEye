-- Create enum for scan status
CREATE TYPE public.scan_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create enum for subdomain status
CREATE TYPE public.subdomain_status AS ENUM ('active', 'inactive', 'unknown');

-- Create scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_domain TEXT NOT NULL,
  status scan_status NOT NULL DEFAULT 'pending',
  total_subdomains INTEGER DEFAULT 0,
  active_subdomains INTEGER DEFAULT 0,
  anomalies INTEGER DEFAULT 0,
  cloud_assets INTEGER DEFAULT 0,
  takeover_vulnerable INTEGER DEFAULT 0,
  scan_options JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subdomains table
CREATE TABLE public.subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status subdomain_status NOT NULL DEFAULT 'unknown',
  ip_addresses TEXT[] DEFAULT '{}',
  http_status INTEGER,
  https_status INTEGER,
  technologies TEXT[] DEFAULT '{}',
  server TEXT,
  cloud_provider TEXT,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_reason TEXT,
  takeover_vulnerable BOOLEAN DEFAULT FALSE,
  takeover_type TEXT,
  cname_record TEXT,
  dns_records JSONB DEFAULT '{}',
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  wayback_urls TEXT[] DEFAULT '{}',
  ports JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_subdomains_scan_id ON public.subdomains(scan_id);
CREATE INDEX idx_subdomains_status ON public.subdomains(status);
CREATE INDEX idx_subdomains_risk_score ON public.subdomains(risk_score DESC);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_target_domain ON public.scans(target_domain);

-- Enable Row Level Security
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;

-- RLS policies for scans - users can only see their own scans
CREATE POLICY "Users can view their own scans" 
ON public.scans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans" 
ON public.scans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" 
ON public.scans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans" 
ON public.scans FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for subdomains - based on scan ownership
CREATE POLICY "Users can view subdomains from their scans" 
ON public.subdomains FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.scans 
    WHERE scans.id = subdomains.scan_id 
    AND scans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create subdomains in their scans" 
ON public.subdomains FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scans 
    WHERE scans.id = subdomains.scan_id 
    AND scans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete subdomains from their scans" 
ON public.subdomains FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.scans 
    WHERE scans.id = subdomains.scan_id 
    AND scans.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scans_updated_at
BEFORE UPDATE ON public.scans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow service role to insert subdomains for edge functions
CREATE POLICY "Service role can manage all subdomains"
ON public.subdomains FOR ALL
USING (true)
WITH CHECK (true);

-- Allow service role to manage scans
CREATE POLICY "Service role can manage all scans"
ON public.scans FOR ALL
USING (true)
WITH CHECK (true);